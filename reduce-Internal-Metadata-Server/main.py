from flask import Flask, request, jsonify
import json
import hashlib
from urllib.parse import urlparse
import platform
import os
import subprocess
import uuid
import socket

from model import (
    initialize_db,
    insert_download,
    is_duplicate_download,
    get_normalized_path,
    extract_filename,
    delete_record_by_partial_hash,
    create_connection
)

app = Flask(__name__)

# Initialize the database when the application starts
initialize_db()

def get_system_info():
    system_info = {}

    def get_device_id():
        try:
            if platform.system() == "Linux":
                with open("/etc/machine-id", "r") as f:
                    return f.read().strip()
            elif platform.system() == "Windows":
                return str(uuid.uuid1())
            elif platform.system() == "Darwin":
                return subprocess.check_output("system_profiler SPHardwareDataType | grep 'UUID:'", shell=True).decode().split(":")[1].strip()
            else:
                return "Platform not supported for device ID"
        except FileNotFoundError:
            return "Unknown"
        except Exception as e:
            print(f"Error getting device ID: {e}")
            return "Unknown"

    def get_device_name():
        try:
            return socket.gethostname()
        except Exception as e:
            print(f"Error getting device name: {e}")
            return "Unknown"

    def get_current_user():
        try:
            if platform.system() == "Windows":
                return os.environ.get("USERNAME")
            else:
                return os.environ.get("USER")
        except Exception as e:
            print(f"Error getting current user: {e}")
            return "Unknown"

    def get_mac_address():
        try:
            if platform.system() == "Windows":
                result = subprocess.check_output(["getmac", "/fo", "csv", "/nh"]).decode().strip().split(",")[0].replace('"', '')
                if result == "":
                    result = subprocess.check_output(["ipconfig", "/all"]).decode()
                    mac_address_lines = [line for line in result.splitlines() if "Physical Address" in line]
                    if mac_address_lines:
                        mac_address = mac_address_lines[0].split(":")[1].strip().replace("-", ":")
                        return mac_address
                    else:
                        return "MAC not found"
                return result
            elif platform.system() == "Linux":
                result = subprocess.check_output(["ip", "link"]).decode()
                for line in result.splitlines():
                    if "link/ether" in line:
                        return line.split()[1]
                return "MAC not found"
            elif platform.system() == "Darwin":
                result = subprocess.check_output("ifconfig en0 | grep ether", shell=True).decode().split()[1]
                return result
            else:
                return "Platform not supported for MAC address"
        except Exception as e:
            print(f"Error getting MAC address: {e}")
            return "Unknown"

    system_info["device_id"] = get_device_id()
    system_info["device_name"] = get_device_name()
    system_info["current_user"] = get_current_user()
    system_info["mac_address"] = get_mac_address()

    return system_info

@app.route('/device_info', methods=['GET'])
def device_info():
    return jsonify(get_system_info())

@app.route('/process_download', methods=['POST'])
def process_download():
    data = request.get_json()
    action = 1  # Default action

    if not data:
        return jsonify({'error': 'No data received'}), 400

    download_id = data.get('id')
    nested_data = data.get('data')

    if not download_id or not nested_data:
        return jsonify({'error': 'Missing "id" or "data" in the received JSON'}), 400

    download_meta_data = nested_data.get('download_meta_data')
    fetched_complete_metadata = nested_data.get('fetched_complete_metadata')
    download_file_details = nested_data.get('downloadFileNameDomainUrlDetails')
    partial_hash_verify = nested_data.get('partial_hash')
    device_info_data = nested_data.get('device_info', {})

    if not download_meta_data or not fetched_complete_metadata or not download_file_details:
        return jsonify({'error': 'Incomplete data received'}), 400

    merged_metadata = {
        "download_meta_data": download_meta_data,
        "fetched_complete_metadata": fetched_complete_metadata,
        "downloadFileNameDomainUrlDetails": download_file_details,
        "partial_hash_verify": partial_hash_verify,
        "device_info": device_info_data
    }
    print(merged_metadata)

    final_url = download_meta_data.get("finalUrl")
    if not final_url:
        return jsonify({'error': 'finalUrl is missing in download_meta_data'}), 400

    normalized_path = get_normalized_path(final_url)
    filename_extracted = extract_filename({
        "finalUrl": final_url,
        "url": download_meta_data.get("url"),
        "content_disposition": fetched_complete_metadata.get("content-disposition")
    })

    if not filename_extracted:
        return jsonify({'error': 'Unable to extract filename'}), 400

    id_hash_verify_input = download_file_details.get("downloadFileName", "") + str(
        fetched_complete_metadata.get("content-length", "0"))
    id_hash_verify = hashlib.sha1(id_hash_verify_input.encode()).hexdigest()

    extracted_data = {
        "id_hash_verify": id_hash_verify,
        "url": download_meta_data.get("url"),
        "referrer": download_meta_data.get("referrer"),
        "finalUrl": final_url,
        "normalized_path": normalized_path,
        "filename_extracted": filename_extracted,
        "filename": download_file_details.get("downloadFileName"),
        "download_server_domain": download_file_details.get("domain"),
        "content-length": int(fetched_complete_metadata.get("content-length", 0)),
        "content-type": fetched_complete_metadata.get("content-type"),
        "last-modified": fetched_complete_metadata.get("last-modified"),
        "etag": fetched_complete_metadata.get("etag"),
        "content-disposition": fetched_complete_metadata.get("content-disposition"),
        "current_user": device_info_data.get("current_user", "Unknown"),
        "device_id": device_info_data.get("device_id", "Unknown"),
        "device_name": device_info_data.get("device_name", "Unknown"),
        "mac_address": device_info_data.get("mac_address", "Unknown"),
        "partial_hash_verify": partial_hash_verify
    }
    
    print()

    duplicate_status = is_duplicate_download(extracted_data)
    if duplicate_status == 0:
        # Duplicate found, mark as cancelled
        extracted_data['status'] = 'cancelled'
        insert_download(extracted_data)
        action = 1  # Cancel duplicate download
    else:
        # Not a duplicate, mark as completed
        extracted_data['status'] = 'completed'
        insert_download(extracted_data)
        action = 0  # Proceed with download

    return jsonify({'action': action}), 200

@app.route('/delete_record', methods=['POST'])
def delete_record():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data received'}), 400

    partial_hash = data.get('partial_hash_verify')
    if not partial_hash:
        return jsonify({'error': 'partial_hash_verify is missing'}), 400

    deleted = delete_record_by_partial_hash(partial_hash)

    if deleted:
        return jsonify({'status': 'success', 'message': f'Record with partial_hash_verify {partial_hash} deleted.'}), 200
    else:
        return jsonify({'status': 'not_found', 'message': f'No record found for partial_hash_verify {partial_hash}'}), 404

@app.route('/get_all_downloads', methods=['GET'])
def get_all_downloads():
    conn = create_connection()
    downloads = []
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM downloads;")
            rows = cursor.fetchall()
            columns = [column[0] for column in cursor.description]
            for row in rows:
                downloads.append(dict(zip(columns, row)))
        except Exception as e:
            print(f"Error fetching all downloads: {e}")
        finally:
            conn.close()
    return jsonify(downloads), 200

@app.route('/cancelled_download_stats', methods=['GET'])
def cancelled_download_stats():
    conn = create_connection()
    count = 0
    total_length = 0
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), SUM(content_length) FROM downloads WHERE status = 'cancelled';")
            row = cursor.fetchone()
            if row:
                count, total_length = row[0], (row[1] if row[1] is not None else 0)
        except Exception as e:
            print(f"Error fetching cancelled download stats: {e}")
        finally:
            conn.close()
    return jsonify({
        'cancelled_count': count,
        'cancelled_total_content_length': total_length
    }), 200

@app.route('/completed_download_stats', methods=['GET'])
def completed_download_stats():
    conn = create_connection()
    count = 0
    total_length = 0
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), SUM(content_length) FROM downloads WHERE status = 'completed';")
            row = cursor.fetchone()
            if row:
                count, total_length = row[0], (row[1] if row[1] is not None else 0)
        except Exception as e:
            print(f"Error fetching completed download stats: {e}")
        finally:
            conn.close()
    return jsonify({
        'completed_count': count,
        'completed_total_content_length': total_length
    }), 200

if __name__ == '__main__':
    app.run(port=5050, debug=True)
