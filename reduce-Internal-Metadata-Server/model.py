import sqlite3
from sqlite3 import Error
from urllib.parse import urlparse
import uuid

DATABASE = 'downloads.db'

def create_connection():
    conn = None
    try:
        conn = sqlite3.connect(DATABASE)
    except Error as e:
        print(f"Error connecting to database: {e}")
    return conn

def initialize_db():
    print("creating db")
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS downloads (
        uuid TEXT PRIMARY KEY,
        id_hash_verify TEXT UNIQUE,
        url TEXT NOT NULL,
        referrer TEXT,
        finalUrl TEXT,
        normalized_path TEXT,
        filename TEXT,
        download_server_domain TEXT,
        content_length INTEGER,
        content_type TEXT,
        last_modified TEXT,
        etag TEXT,
        content_disposition TEXT,
        current_user TEXT,
        device_id TEXT,
        device_name TEXT,
        mac_address TEXT,
        partial_hash_verify TEXT,
        status TEXT,
        inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    conn = create_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(create_table_sql)
            # Create indexes if they don't exist
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_normalized_path ON downloads (normalized_path);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_filename ON downloads (filename);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_id_hash_verify ON downloads (id_hash_verify);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_length ON downloads (content_length);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_last_modified ON downloads (last_modified);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_etag ON downloads (etag);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_partial_hash_verify ON downloads (partial_hash_verify);")

            # Check if 'status' column exists, if not present (older schema), we add it.
            cursor.execute("PRAGMA table_info(downloads);")
            columns = [col[1] for col in cursor.fetchall()]
            if "status" not in columns:
                cursor.execute("ALTER TABLE downloads ADD COLUMN status TEXT;")

            conn.commit()
            print("Database initialized successfully.")
        except Error as e:
            print(f"Error creating table: {e}")
        finally:
            conn.close()

def insert_download(download_data):
    insert_sql = """
    INSERT INTO downloads (
        uuid, id_hash_verify, url, referrer, finalUrl, normalized_path,
        filename, download_server_domain, content_length, content_type,
        last_modified, etag, content_disposition, current_user, device_id,
        device_name, mac_address, partial_hash_verify, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """
    conn = create_connection()
    if conn:
        try:
            cursor = conn.cursor()
            download_uuid = str(uuid.uuid4())
            cursor.execute(insert_sql, (
                download_uuid,
                download_data.get('id_hash_verify'),
                download_data.get('url'),
                download_data.get('referrer'),
                download_data.get('finalUrl'),
                download_data.get('normalized_path'),
                download_data.get('filename'),
                download_data.get('download_server_domain'),
                download_data.get('content-length'),
                download_data.get('content-type'),
                download_data.get('last-modified'),
                download_data.get('etag'),
                download_data.get('content-disposition'),
                download_data.get('current_user'),
                download_data.get('device_id'),
                download_data.get('device_name'),
                download_data.get('mac_address'),
                download_data.get('partial_hash_verify'),
                download_data.get('status')
            ))
            conn.commit()
            print(f"Download inserted with UUID: {download_uuid}")
        except sqlite3.IntegrityError:
            print(f"Download with id_hash_verify {download_data.get('id_hash_verify')} already exists.")
        except Error as e:
            print(f"Error inserting download: {e}")
        finally:
            conn.close()

def delete_record_by_partial_hash(partial_hash):
    delete_sql = "DELETE FROM downloads WHERE partial_hash_verify = ?;"
    conn = create_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(delete_sql, (partial_hash,))
            conn.commit()
            if cursor.rowcount > 0:
                print(f"Record with partial_hash_verify {partial_hash} deleted successfully.")
                return True
            else:
                print(f"No record found with partial_hash_verify {partial_hash}.")
                return False
        except Error as e:
            print(f"Error deleting record: {e}")
            return False
        finally:
            conn.close()

def fetch_download_by_id_hash_verify(id_hash_verify):
    select_sql = "SELECT * FROM downloads WHERE id_hash_verify = ?;"
    conn = create_connection()
    download = None
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(select_sql, (id_hash_verify,))
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                download = dict(zip(columns, row))
        except Error as e:
            print(f"Error fetching download: {e}")
        finally:
            conn.close()
    return download

def fetch_downloads_by_fields(filename, content_length=None, last_modified=None, etag=None):
    select_sql = "SELECT * FROM downloads WHERE filename = ?"
    params = [filename]

    if content_length is not None:
        select_sql += " AND content_length = ?"
        params.append(content_length)
    if last_modified is not None:
        select_sql += " AND last_modified = ?"
        params.append(last_modified)
    if etag is not None:
        select_sql += " AND etag = ?"
        params.append(etag)

    conn = create_connection()
    downloads = []
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(select_sql, tuple(params))
            rows = cursor.fetchall()
            columns = [column[0] for column in cursor.description]
            for row in rows:
                downloads.append(dict(zip(columns, row)))
        except Error as e:
            print(f"Error fetching downloads by fields: {e}")
        finally:
            conn.close()
    return downloads

def get_normalized_path(url):
    parsed_url = urlparse(url)
    return parsed_url.path.rstrip('/')

def is_duplicate_download(current_download):
    id_hash_verify = current_download.get('id_hash_verify')
    if id_hash_verify:
        existing_download = fetch_download_by_id_hash_verify(id_hash_verify)
        if existing_download:
            print(f"[Layer 1] Duplicate found based on id_hash_verify: {id_hash_verify}")
            return 0

    filename = current_download.get('filename')
    content_length = current_download.get('content-length')
    last_modified = current_download.get('last-modified')
    etag = current_download.get('etag')

    if filename:
        matching_downloads = fetch_downloads_by_fields(filename, content_length, last_modified, etag)
        if matching_downloads:
            print(f"[Layer 2] Duplicate found for filename: {filename}")
            return 0

    url = current_download.get('url')
    referrer = current_download.get('referrer')
    if url and referrer:
        select_sql = "SELECT * FROM downloads WHERE url = ? AND referrer = ?;"
        conn = create_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(select_sql, (url, referrer))
                row = cursor.fetchone()
                if row:
                    print("[Layer 3] Duplicate found based on URL and referrer.")
                    return 0
            except Error as e:
                print(f"Error during Layer 3 duplicate check: {e}")
            finally:
                conn.close()

    print("No duplicate detected.")
    return 1

def extract_filename(download):
    content_disp = download.get('content_disposition')
    if content_disp:
        parts = content_disp.split(';')
        for part in parts:
            part = part.strip()
            if part.startswith('filename='):
                return part.split('=')[1].strip('"')
    final_url = download.get('finalUrl') or download.get('url')
    if final_url:
        return get_normalized_path(final_url).split('/')[-1]
    return None
