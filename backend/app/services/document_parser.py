import os
from typing import Dict, Any, List
try:
    import pymupdf as fitz
except ImportError:
    import fitz
import docx

class DocumentParser:
    """
    Parses unstructured CTI documents across PDF, DOCX, TXT, and Markdown formats.
    Preserves paragraph context, technical artifacts, and structural offsets.
    """

    @staticmethod
    def parse_file(file_path: str, original_filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(original_filename)[1].lower()
        if ext not in [".pdf", ".docx", ".doc", ".txt", ".md"]:
            raise ValueError(f"Unsupported file format: {ext}. Allowed: PDF, DOCX, TXT, MD.")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise ValueError("The uploaded document is empty (0 bytes).")

        if ext == ".txt":
            return DocumentParser._parse_text(file_path, original_filename, file_size)
        elif ext == ".md":
            return DocumentParser._parse_markdown(file_path, original_filename, file_size)
        elif ext == ".pdf":
            return DocumentParser._parse_pdf(file_path, original_filename, file_size)
        elif ext in [".docx", ".doc"]:
            return DocumentParser._parse_docx(file_path, original_filename, file_size)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Allowed: PDF, DOCX, TXT, MD.")

    @staticmethod
    def _parse_text(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        title = DocumentParser._extract_title(content, filename)
        
        return {
            "title": title,
            "content": content,
            "paragraphs": paragraphs,
            "file_type": "txt",
            "file_size": file_size,
            "char_count": len(content),
            "line_count": len(content.splitlines()),
        }

    @staticmethod
    def _parse_markdown(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        title = DocumentParser._extract_title(content, filename)

        return {
            "title": title,
            "content": content,
            "paragraphs": paragraphs,
            "file_type": "md",
            "file_size": file_size,
            "char_count": len(content),
            "line_count": len(content.splitlines()),
        }

    @staticmethod
    def _parse_pdf(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise ValueError(f"Unable to read or parse PDF file: {str(e)}")

        pages_text = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pages_text.append(page.get_text())

        full_content = "\n\n".join(pages_text).strip()
        if not full_content:
            raise ValueError("No extractable text found in PDF document.")

        paragraphs = [p.strip() for p in full_content.split("\n\n") if p.strip()]
        title = DocumentParser._extract_title(full_content, filename)

        return {
            "title": title,
            "content": full_content,
            "paragraphs": paragraphs,
            "file_type": "pdf",
            "file_size": file_size,
            "char_count": len(full_content),
            "page_count": len(doc),
        }

    @staticmethod
    def _parse_docx(file_path: str, filename: str, file_size: int) -> Dict[str, Any]:
        try:
            doc = docx.Document(file_path)
        except Exception as e:
            raise ValueError(f"Unable to parse DOCX file: {str(e)}")

        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        full_content = "\n\n".join(paragraphs).strip()
        if not full_content:
            raise ValueError("No extractable text found in DOCX document.")

        title = DocumentParser._extract_title(full_content, filename)

        return {
            "title": title,
            "content": full_content,
            "paragraphs": paragraphs,
            "file_type": "docx",
            "file_size": file_size,
            "char_count": len(full_content),
            "paragraph_count": len(paragraphs),
        }

    @staticmethod
    def _extract_title(content: str, fallback_filename: str) -> str:
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("#"):
                line = line.lstrip("#").strip()
            if line.lower().startswith("title:"):
                line = line[6:].strip()
            if len(line) > 5:
                return line[:200]
        return os.path.splitext(fallback_filename)[0].replace("_", " ").title()
