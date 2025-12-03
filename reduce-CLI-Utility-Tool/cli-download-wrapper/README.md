# ReDUCE CLI Download Wrapper

> **Command-line interface for download commands with ReDUCE intelligence**

The CLI Download Wrapper intercepts and wraps common download commands (wget, curl) and download scripts, adding ReDUCE duplicate detection capabilities.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Supported Commands](#supported-commands)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is the CLI Download Wrapper?

The CLI Download Wrapper is a command-line tool that:
- **Wraps** common download commands (wget, curl)
- **Executes** Python and Bash download scripts
- **Extracts** metadata from downloads
- **Communicates** with the Metadata Server for duplicate detection
- **Attaches** ReDUCE metadata to downloaded files

### Role in ReDUCE System

The CLI wrapper provides a command-line interface to the ReDUCE system, allowing users to benefit from duplicate detection when using terminal-based download tools.

---

## Features

### ✨ Core Capabilities

- **🔧 Command Wrapping**
  - `wget` command support
  - `curl` command support
  - Pass-through of all flags and options

- **📜 Script Execution**
  - Python script execution (`.py`)
  - Bash script execution (`.sh`)
  - Argument passing to scripts

- **📊 Metadata Extraction**
  - URL and domain information
  - File size via HEAD request
  - Content-Type, ETag, Last-Modified
  - Partial hash computation

- **🔍 Duplicate Detection**
  - Server communication
  - Pre-download duplicate checking
  - Automatic metadata attachment

---

## Prerequisites

- **Python**: 3.7 or higher
- **Commands** (if using):
  - `wget` - For wget command support
  - `curl` - For curl command support
- **ReDUCE Server**: Metadata Server running on `http://127.0.0.1:5050`

---

## Installation

### Step 1: Navigate to Directory

```bash
cd cli-download-wrapper
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Verify Installation

```bash
python reduce.py --help
```

---

## Usage

### Basic Syntax

```bash
python reduce.py <command> [arguments]
```

### Hello World Example

```bash
python reduce.py hello
```

**Output**: `Hello, World!`

---

## Supported Commands

### 1️⃣ wget Command

Wrap wget with ReDUCE intelligence:

```bash
python reduce.py wget [wget_options] <URL>
```

**Examples**:

```bash
# Basic download
python reduce.py wget https://example.com/file.zip

# With wget options
python reduce.py wget -O output.zip https://example.com/file.zip

# With multiple flags
python reduce.py wget -c --tries=3 https://example.com/file.zip
```

**How it works**:
1. Extracts URL from arguments
2. Fetches metadata via HEAD request
3. Checks for duplicates with server
4. Executes wget if not duplicate
5. Attaches ReDUCE metadata to downloaded file

---

### 2️⃣ curl Command

Wrap curl with ReDUCE intelligence:

```bash
python reduce.py curl [curl_options] <URL>
```

**Examples**:

```bash
# Basic download
python reduce.py curl https://example.com/file.zip

# With output file
python reduce.py curl -o output.zip https://example.com/file.zip

# With curl options
python reduce.py curl -L -C - https://example.com/file.zip
```

---

### 3️⃣ Python Scripts

Execute Python download scripts:

```bash
python reduce.py <script.py> [script_arguments]
```

**Example**:

```bash
python reduce.py download_script.py --url https://example.com/file.zip
```

**Requirements**:
- Script must have `.py` extension
- Python must be installed
- Script will be executed with ReDUCE wrapper

---

### 4️⃣ Bash Scripts

Execute Bash download scripts:

```bash
python reduce.py <script.sh> [script_arguments]
```

**Example**:

```bash
python reduce.py download_script.sh https://example.com/file.zip
```

**Requirements**:
- Script must have `.sh` extension
- Bash must be available (built-in on Linux/macOS)
- On Windows: Git Bash, WSL, or Cygwin required

---

## Architecture

### Project Structure

```
cli-download-wrapper/
├── reduce.py                 # Main CLI entry point
├── handlers/                 # Download handlers
│   ├── wget_handler.py      # wget command wrapper
│   ├── curl_handler.py      # curl command wrapper
│   ├── python_handler.py    # Python script executor
│   └── bash_handler.py      # Bash script executor
├── download_logic/           # Download processing
│   └── download_handler.py  # Core download logic
├── utils/                    # Helper utilities
│   └── helpers.py           # Shared functions
└── requirements.txt          # Dependencies
```

### Data Flow

```
User Command
    ↓
reduce.py (parses command)
    ↓
Handler (wget_handler, curl_handler, etc.)
    ↓
Download Logic (extract metadata, check server)
    ↓
Utils (helpers for metadata, server comm)
    ↓
Execute Native Command / Script
    ↓
Attach Metadata to Downloaded File
```

---

## Development

### Adding New Handlers

To add support for a new download command:

#### Step 1: Create Handler

Create `handlers/new_command_handler.py`:

```python
def handle_new_command(args):
    # Extract URL and options
    # Fetch metadata
    # Check with server
    # Execute command
    # Attach metadata
    pass
```

#### Step 2: Register in reduce.py

Update `reduce.py`:

```python
from handlers.new_command_handler import handle_new_command

# In main():
elif subcommand.lower() == "newcommand":
    handle_new_command(subcommand_args)
```

---

### Testing

```bash
# Test wget wrapper
python reduce.py wget https://httpbin.org/bytes/1024

# Test curl wrapper
python reduce.py curl https://httpbin.org/bytes/1024

# Test help
python reduce.py --help
```

---

## Troubleshooting

### ❌ Command Not Found (wget/curl)

**Error**: `wget: command not found`

**Solution**: Install the required command

**Windows**:
```powershell
# Install via Chocolatey
choco install wget
choco install curl
```

**Linux**:
```bash
sudo apt-get install wget curl
```

**macOS**:
```bash
brew install wget curl
```

---

### ❌ Server Connection Failed

**Error**: `Failed to communicate with the server`

**Solution**: Ensure Metadata Server is running

```bash
cd ../../reduce-Internal-Metadata-Server
python main.py
```

---

### ❌ Python Script Not Executing

**Error**: Script doesn't run

**Solutions**:
1. Ensure script has `.py` extension
2. Check script has execute permissions (Linux/macOS)
3. Verify Python is installed: `python --version`

---

### ❌ Bash Script Not Executing (Windows)

**Error**: `bash: command not found`

**Solutions**:
1. Install Git Bash
2. Use WSL (Windows Subsystem for Linux)
3. Install Cygwin
4. Or use Python scripts instead

---

## Configuration

### Server Endpoint

**File**: `utils/helpers.py` (Line 182)

```python
resp = requests.post("http://127.0.0.1:5050/process_download", ...)
```

Change `127.0.0.1:5050` to your server address.

---

## Related Documentation

- **[Parent README](../README.md)** - CLI Utility Tools overview
- **[File Monitoring Service](../file-monitoring-service/README.md)** - File system monitoring
- **[Metadata Server](../../reduce-Internal-Metadata-Server/README.md)**  - Server API documentation
- **[Root README](../../README.md)** - Complete ReDUCE system

---

<div align="center">

**Part of the ReDUCE ecosystem**

*Command-line download management*

</div>
