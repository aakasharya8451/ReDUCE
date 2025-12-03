# ReDUCE File Monitoring Service

> **Cross-platform file system monitoring for intelligent duplicate download detection**

The File Monitoring Service tracks files with ReDUCE metadata and automatically synchronizes with the Metadata Server when files are deleted from the system.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Metadata Checker Utility](#metadata-checker-utility)
- [Running as Service](#running-as-service)
- [Troubleshooting](#troubleshooting)
- [Platform-Specific Details](#platform-specific-details)

---

## Overview

### What is the File Monitoring Service?

The File Monitoring Service is a background process that:
- **Monitors** the file system for files with ReDUCE metadata
- **Tracks** file changes (create, modify, move, delete) in real-time
- **Synchronizes** with the Metadata Server when files are deleted
- **Maintains** an in-memory cache of tracked files for performance

### Role in ReDUCE System

When a user deletes a downloaded file, the service automatically notifies the Metadata Server to remove the corresponding database record, keeping the system in sync.

---

## Features

### ✨ Core Capabilities

- **🔄 Cross-Platform File Monitoring**
  - Windows, Linux, and macOS support
  - Real-time event processing via Watchdog library

- **💾 Platform-Specific Metadata Storage**
  - **Windows**: Alternate Data Streams (ADS) - `filename:file_hash_check_parts`
  - **Linux/macOS**: Extended Attributes (xattr) - `user.file_hash_check_parts`

- **⚡ Real-Time Event Tracking**
  - File creation with metadata
  - File modification and metadata changes
  - File moves and renames
  - File deletions

- **🗂️ Intelligent Caching**
  - Recursive directory scanning on startup
  - In-memory tracking for fast lookups
  - Automatic cache updates on file events

- **🔌 Server Synchronization**
  - HTTP POST requests to Metadata Server
  - Automatic cleanup of deleted file records
  - Device information included in requests

---

## How It Works

### Metadata Storage

Files downloaded through the ReDUCE system have a special metadata attribute attached:

| Platform | Method | Attribute Name | Example |
|----------|--------|----------------|---------|
| **Windows** | Alternate Data Streams | `:file_hash_check_parts` | `file.zip:file_hash_check_parts` |
| **Linux** | Extended Attributes | `user.file_hash_check_parts` | `xattr -l file.zip` |
| **macOS** | Extended Attributes | `user.file_hash_check_parts` | `xattr -l file.zip` |

### Event Handling

#### 1️⃣ **File Created**
```python
[CREATED] Added to tracking: C:\Downloads\file.zip (Hash: abc123...)
```

#### 2️⃣ **File Modified**
```python
# Check if metadata still exists
# If lost: Remove from tracking and notify server
```

#### 3️⃣ **File Moved**
```python
# Update tracking with new path
[MOVED] File moved to: C:\Documents\file.zip (Hash: abc123...)
```

#### 4️⃣ **File Deleted**
```python
[DELETED] C:\Downloads\file.zip (Hash: abc123...)
Successfully deleted record from server: abc123...
```

---

## Prerequisites

### System Requirements

- **Python**: 3.7 or higher
- **pip**: Python package manager
- **Operating System**: Windows 7+, Linux (any modern distro), or macOS 10.12+

### Platform-Specific Requirements

#### Windows
- No additional requirements (uses `ctypes` for ADS)
- Administrator privileges recommended for monitoring system directories

#### Linux
- Extended attributes support (`xattr`)
- Filesystem with xattr support (ext4, XFS, Btrfs)

#### macOS
- Extended attributes support (built into APFS/HFS+)
- `pyxattr` Python library

---

## Installation

### Step 1: Navigate to Directory

```bash
cd file-monitoring-service
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

**Dependencies**:
- `requests` - HTTP client for server communication
- `watchdog` - File system event monitoring
- `pyxattr` - Extended attributes (Linux/macOS only)
- `pyinstaller` - Optional, for building standalone executables

### Step 3: Verify Installation

```bash
python file_monitor.py
```

---

## Configuration

### Default Settings

| Setting | Windows | Linux/macOS |
|---------|---------|-------------|
| **Monitored Path** | `C:\` | `~/` (home directory) |
| **Server Endpoint** | `http://127.0.0.1:5050` | `http://127.0.0.1:5050` |
| **Excluded Dirs** | `C:\Windows`, `C:\Program Files`, `C:\ProgramData` | None |

### Customizing Monitored Path

**File**: `file_monitor.py` (Lines 312-315)

```python
if __name__ == "__main__":
    if is_windows():
        path_to_monitor = "C:\\"  # Change this
    else:
        path_to_monitor = os.path.expanduser("~")  # Change this
```

**Recommended**: Monitor specific directories for better performance:

```python
# Windows - Monitor Downloads folder only
path_to_monitor = "C:\\Users\\YourName\\Downloads"

# Linux/macOS - Monitor Downloads folder only
path_to_monitor = os.path.expanduser("~/Downloads")
```

### Customizing Server Endpoint

**File**: `file_monitor.py` (Line 211)

```python
def send_delete_request(partial_hash_verify):
    url = "http://127.0.0.1:5050/delete_record"  # Change port here
```

---

## Usage

### Basic Usage

```bash
python file_monitor.py
```

### Expected Output

```
Monitoring: C:\
Initializing cache...
Added to tracking: C:\Users\User\Downloads\file1.zip (Hash: abc123def456...)
Added to tracking: C:\Users\User\Downloads\file2.pdf (Hash: xyz789ghi012...)
Cache initialized with 2 files.
Monitoring started on: C:\
```

---

## Metadata Checker Utility

The service includes a utility to check metadata on files.

### Usage

```bash
python metadata_checker.py <file_path>
```

### Examples

**Windows**:
```powershell
python metadata_checker.py "C:\Downloads\file.zip"
```

**Linux/macOS**:
```bash
python metadata_checker.py ~/Downloads/file.zip
```

### Output

```
file_hash_check_parts for 'file.zip': abc123def456789...
```

Or if no metadata:
```
No 'file_hash_check_parts' attribute found for 'file.zip'.
```

---

## Running as Service

### Windows (Task Scheduler)

```powershell
# Create task to run at user login
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\path\to\file_monitor.py"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "ReDUCE File Monitor" -Action $action -Trigger $trigger
```

### Linux (systemd)

**Create service file**: `/etc/systemd/system/reduce-file-monitor.service`

```ini
[Unit]
Description=ReDUCE File Monitoring Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/file-monitoring-service
ExecStart=/usr/bin/python3 /path/to/file_monitor.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable reduce-file-monitor.service
sudo systemctl start reduce-file-monitor.service
```

### macOS (launchd)

**Create plist file**: `~/Library/LaunchAgents/com.reduce.filemonitor.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.reduce.filemonitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/path/to/file_monitor.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

**Load**:
```bash
launchctl load ~/Library/LaunchAgents/com.reduce.filemonitor.plist
```

---

## Troubleshooting

### ❌ `ModuleNotFoundError: No module named 'xattr'`

**Platform**: Linux/macOS

**Solution**:
```bash
pip install pyxattr
```

### ❌ `PermissionError: [Errno 13] Permission denied`

**Solution**: Run with elevated privileges or change monitored path to user directory

**Windows**:
```powershell
# Run as Administrator
```

**Linux/macOS**:
```bash
sudo python3 file_monitor.py
# OR change path to user directory
path_to_monitor = os.path.expanduser("~/Downloads")
```

### ❌ `ConnectionError: Failed to connect to server`

**Solution**: Ensure Metadata Server is running

```bash
cd ../../reduce-Internal-Metadata-Server
python main.py
```

### ❌ Files Not Being Tracked

**Check metadata manually**:

**Windows (PowerShell)**:
```powershell
Get-Content "file.zip" -Stream file_hash_check_parts
```

**Linux**:
```bash
getfattr -n user.file_hash_check_parts file.zip
```

**macOS**:
```bash
xattr -p user.file_hash_check_parts file.zip
```

---

## Platform-Specific Details

### Windows: Alternate Data Streams (ADS)

ADS allows storing metadata alongside files without modifying the file itself.

**Advantages**:
- ✅ Native Windows support (NTFS)
- ✅ No special libraries needed
- ✅ Metadata persists across file moves

**Limitations**:
- ❌ Only works on NTFS filesystems
- ❌ Lost when copying to non-NTFS systems (FAT32, exFAT)

**Reading ADS**:
```python
ads_path = f"{file_path}:file_hash_check_parts"
with open(ads_path, "r") as ads:
    hash_data = ads.read()
```

### Linux/macOS: Extended Attributes (xattr)

Extended attributes store metadata in the filesystem.

**Supported Filesystems**:
- Linux: ext4, XFS, Btrfs
- macOS: APFS, HFS+

**Reading xattr**:
```python
import xattr
hash_data = xattr.getxattr(file_path, b"user.file_hash_check_parts")
```

---

## Related Documentation

- **[Parent README](../README.md)** - CLI Utility Tools overview
- **[CLI Download Wrapper](../cli-download-wrapper/README.md)** - Download command wrapper
- **[Metadata Server](../../reduce-Internal-Metadata-Server/README.md)** - Server API documentation
- **[Root README](../../README.md)** - Complete ReDUCE system

---

<div align="center">

**Part of the ReDUCE ecosystem**

*Intelligent file system monitoring*

</div>
