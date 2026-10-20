import re
import uuid
from typing import List, Dict, Any, Set

class IOCExtractor:
    """
    Extracts, validates, deduplicates, and contextualizes Indicators of Compromise (IOCs).
    Strictly passive analysis - never contacts external infrastructure.
    """

    IPV4_REGEX = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
    EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
    URL_REGEX = re.compile(r'https?://[^\s<>"\')]+')
    MD5_REGEX = re.compile(r'\b[a-fA-F0-9]{32}\b')
    SHA1_REGEX = re.compile(r'\b[a-fA-F0-9]{40}\b')
    SHA256_REGEX = re.compile(r'\b[a-fA-F0-9]{64}\b')
    DOMAIN_REGEX = re.compile(r'\b((?:[a-zA-Z0-9-]+\.)+(?:com|net|org|io|biz|info|example|example\.com|example\.net))\b', re.IGNORECASE)
    FILE_REGEX = re.compile(r'\b([a-zA-Z0-9_\-\s]+\.(?:docm|docx|zip|vbs|jsp|bin|browser|lnk|pdf|txt|exe))\b', re.IGNORECASE)

    def extract_iocs(self, text: str) -> List[Dict[str, Any]]:
        iocs = []
        seen_keys: Set[str] = set()

        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 5]

        for sentence in sentences:
            sent_lower = sentence.lower()

            # 1. IPv4
            for match in self.IPV4_REGEX.finditer(sentence):
                val = match.group(0)
                # Filter out obvious false positives (e.g. 127.0.0.1 or 0.0.0.0 unless context demands)
                if val.startswith("0."):
                    continue
                key = f"ipv4:{val}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "ipv4",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            # 2. URLs
            for match in self.URL_REGEX.finditer(sentence):
                val = match.group(0).rstrip(".,;")
                key = f"url:{val.lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "url",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            # 3. Domains
            for match in self.DOMAIN_REGEX.finditer(sentence):
                val = match.group(0).rstrip(".,;")
                if "@" in sentence[max(0, match.start()-1):match.start()]:
                    continue
                key = f"domain:{val.lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "domain",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            # 4. Email addresses
            for match in self.EMAIL_REGEX.finditer(sentence):
                val = match.group(0)
                key = f"email:{val.lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "email",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            # 5. Hashes
            for match in self.SHA256_REGEX.finditer(sentence):
                val = match.group(0).lower()
                key = f"sha256:{val}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "sha256",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            for match in self.SHA1_REGEX.finditer(sentence):
                val = match.group(0).lower()
                key = f"sha1:{val}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "sha1",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            for match in self.MD5_REGEX.finditer(sentence):
                val = match.group(0).lower()
                key = f"md5:{val}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "md5",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

            # 6. Filenames
            for match in self.FILE_REGEX.finditer(sentence):
                val = match.group(1).strip().rstrip(".,;")
                if val.lower() in ["powershell.exe", "winword.exe", "wscript.exe", "cscript.exe", "java.exe", "vssadmin.exe"]:
                    continue
                key = f"file:{val.lower()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    iocs.append({
                        "id": str(uuid.uuid4()),
                        "ioc_type": "filename",
                        "value": val,
                        "verification_status": "extracted_unverified",
                        "evidence_sentence": sentence,
                        "is_defanged": False
                    })

        return iocs
