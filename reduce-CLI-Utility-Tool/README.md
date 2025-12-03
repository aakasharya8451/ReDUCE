# ReDUCE CLI Utility Tools

> **Command-line utilities for the ReDUCE system**

This directory contains two distinct command-line tools that work together as part of the ReDUCE ecosystem:

---

## 🗂️ Components

### 1️⃣ File Monitoring Service

**Location**: [`file-monitoring-service/`](file-monitoring-service/)

Real-time file system monitoring service that watches for files with ReDUCE metadata and synchronizes deletions with the Metadata Server.

**Key Features**:
- Cross-platform file monitoring (Windows/Linux/macOS)
- Metadata tracking using ADS (Windows) or xattr (Linux/macOS)
- Automatic server synchronization
- Background service capability

📖 **[Full Documentation →](file-monitoring-service/README.md)**

---

### 2️⃣ CLI Download Wrapper

**Location**: [`cli-download-wrapper/`](cli-download-wrapper/)

Command-line interface that wraps common download commands (wget, curl) and download scripts with ReDUCE intelligence for duplicate detection.

**Key Features**:
- Supports `wget` and `curl` commands
- Executes Python and Bash download scripts
- Automatic metadata extraction
- Server communication for duplicate checking

📖 **[Full Documentation →](cli-download-wrapper/README.md)**

---

## 🚀 Quick Start

### Install Both Components

```bash
cd reduce-CLI-Utility-Tool

# Install file monitoring service
cd file-monitoring-service
pip install -r requirements.txt

# Install CLI download wrapper
cd ../cli-download-wrapper
pip install -r requirements.txt
```

### Install Individually

#### File Monitoring Only

```bash
cd file-monitoring-service
pip install -r requirements.txt
python file_monitor.py
```

#### CLI Wrapper Only

```bash
cd cli-download-wrapper
pip install -r requirements.txt
python reduce.py --help
```

---

## 📋 Component Comparison

| Feature | File Monitoring Service | CLI Download Wrapper |
|---------|-------------------------|----------------------|
| **Purpose** | Monitor file system | Wrap download commands |
| **Runs as** | Background service | On-demand CLI tool |
| **Server Communication** | Sends DELETE requests | Sends POST download requests |
| **Platform Support** | Windows, Linux, macOS | Cross-platform |
| **Use Case** | Automatic file tracking | Manual download management |

---

## 🔗 Integration

Both components work together in the ReDUCE ecosystem:

1. **CLI Wrapper** initiates downloads → attaches metadata
2. **File Monitor** detects new files → adds to tracking
3. User deletes file → **File Monitor** notifies server
4. Server updates database → removes record

---

## 📖 Documentation

- **[File Monitoring Service Documentation](file-monitoring-service/README.md)** - Detailed guide for file monitoring
- **[CLI Download Wrapper Documentation](cli-download-wrapper/README.md)** - CLI tool usage and commands
- **[Root README](../README.md)** - Complete ReDUCE system overview
- **[Metadata Server Documentation](../reduce-Internal-Metadata-Server/README.md)** - API reference

---

## 🆘 Support

For issues or questions:
- 📧 Open an issue on GitHub
- 📖 Check component-specific READMEs
- 🔍 Review the [main project documentation](../README.md)

---

<div align="center">

**Part of the ReDUCE ecosystem**

*Intelligent duplicate download detection and prevention*

</div>