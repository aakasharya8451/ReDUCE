import platform
import os
import subprocess
import uuid
import socket

def get_system_info():
    """Gets system information and returns it as a dictionary."""
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
            return get_mac_address()  # Fallback
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
                        return line.split()[2]
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

if __name__ == "__main__":
    info = get_system_info()
    print(info) #print the dictionary
    #or print in formatted way
    for key, value in info.items():
        print(f"{key}: {value}")