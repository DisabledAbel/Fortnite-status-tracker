import os
import subprocess
from datetime import datetime
from glob import glob

# -------- CONFIG --------
PUBLIC_DIR = "./public"  # Folder containing JSON files to backup
FILES_TO_BACKUP = [
    "status.json",
    "history.json",
    "status-badge.json"
]

BACKUP_REPO_PATH = "./status-backup"  # Local clone of your backup GitHub repo
GITHUB_REMOTE = "origin"
BRANCH = "main"
MAX_BACKUPS_PER_FILE = 30  # Keep only the last 30 backups per file
# ------------------------

def ensure_repo_cloned():
    """Clone the backup repo if it doesn't exist locally"""
    if not os.path.exists(BACKUP_REPO_PATH):
        repo_url = input("Enter the HTTPS URL of your backup repo: ").strip()
        subprocess.run(["git", "clone", repo_url, BACKUP_REPO_PATH], check=True)

def copy_files_to_repo():
    """Copy JSON files into the backup repo with timestamped names"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    for file_name in FILES_TO_BACKUP:
        src = os.path.join(PUBLIC_DIR, file_name)
        if not os.path.exists(src):
            print(f"Warning: {src} not found, skipping.")
            continue
        dst_file = f"{file_name.replace('.json','')}_{timestamp}.json"
        dst = os.path.join(BACKUP_REPO_PATH, dst_file)
        subprocess.run(["cp", src, dst], check=True)
        print(f"Copied {src} -> {dst_file}")

def clean_old_backups():
    """Keep only the last MAX_BACKUPS_PER_FILE backups for each JSON file"""
    for file_name in FILES_TO_BACKUP:
        pattern = os.path.join(BACKUP_REPO_PATH, f"{file_name.replace('.json','')}_*.json")
        files = sorted(glob(pattern))
        if len(files) > MAX_BACKUPS_PER_FILE:
            old_files = files[:len(files)-MAX_BACKUPS_PER_FILE]
            for f in old_files:
                os.remove(f)
                print(f"Removed old backup: {os.path.basename(f)}")

def commit_and_push():
    """Commit and push backup files to GitHub"""
    subprocess.run(["git", "-C", BACKUP_REPO_PATH, "add", "."], check=True)
    commit_msg = f"Backup: {datetime.now().isoformat()}"
    subprocess.run(["git", "-C", BACKUP_REPO_PATH, "commit", "-m", commit_msg], check=False)
    subprocess.run(["git", "-C", BACKUP_REPO_PATH, "push", GITHUB_REMOTE, BRANCH], check=True)
    print("✅ Backup pushed to GitHub")

def main():
    ensure_repo_cloned()
    copy_files_to_repo()
    clean_old_backups()
    commit_and_push()

if __name__ == "__main__":
    main()
