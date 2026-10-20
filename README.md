# Transformer-Based Cyber Threat Intelligence Extraction & Attack-Chain Reconstruction

A full-stack, enterprise-grade Security Operations Center (SOC) threat intelligence platform designed to ingest unstructured Cyber Threat Intelligence (CTI) reports in **PDF, DOCX, TXT, or Markdown** formats, extract threat entities and semantic relationships using Hugging Face Transformer token-classification adapters and CTI syntactic engines, reconstruct directed attack sequences, and visualize interactive attack graphs using React Flow.

---

## Architecture & Technology Stack

```
                                  [ Unstructured CTI Report ]
                                   (PDF, DOCX, TXT, Markdown)
                                              │
                                              ▼
                                 [ Stage 1: Document Parser ]
                                  (PyMuPDF, python-docx, TXT)
                                              │
                                              ▼
                           [ Stage 2: Transformer Entity Extraction ]
                               (AutoModelForTokenClassification /
                                CTI Token & Syntax Heuristics)
                                              │
                                              ▼
                           [ Stage 3: Relationship Extraction ]
                              (Sentence Context & Dependency Rules)
                                              │
                                              ▼
                         [ Stage 4: NetworkX Attack Graph Builder ]
                           (Cycle Detection, Weakly Connected Components,
                            Attack Stage Sequencing, React Flow Formatting)
                                              │
                    ┌─────────────────────────┴────────────────────────┐
                    ▼                                                  ▼
          [ FastAPI Backend (Python) ]                    [ React 19 Frontend ]
      - REST API (/api/reports, /api/health)           - React Flow (@xyflow/react)
      - PostgreSQL / SQLite (SQLAlchemy 2.0)           - Recharts Dashboard Metrics
      - Passive IOC & MITRE ATT&CK Engine              - Dark SOC Cyber Visuals
```

### Frontend
- **React 19 & TypeScript**: Component-driven SPA with strict types.
- **Vite & Tailwind CSS v4**: High-performance bundler and dark SOC UI aesthetics.
- **React Flow (`@xyflow/react`)**: Interactive graph canvas with directional edges, circular icon nodes, hierarchical layout, zoom/pan/fit controls, and evidence inspection drawers.
- **Lucide React & Recharts**: High-contrast cybersecurity iconography and analytical telemetry charts.
- **Axios**: Communicates with the FastAPI backend over `/api` proxy.

### Backend
- **Python 3.12 & FastAPI**: Asynchronous REST API with Pydantic v2 validation.
- **PyTorch & Hugging Face Transformers**: Configurable token-classification adapter supporting fine-tuned local checkpoints (e.g. CTI-BERT) and Hugging Face repositories.
- **NetworkX**: Directed graph analysis, topological ordering, cycle detection, and connected components.
- **PyMuPDF & python-docx**: Context-preserving document extraction.
- **SQLAlchemy 2.0 & PostgreSQL / SQLite**: Relational database persistence with analyst audit logs.

---

## 10 Functional Application Views

1. **Overview Dashboard**: Real database metrics (total reports, entities, relationships, attack chains, IOCs, MITRE techniques), entity-type distribution bar charts, and attack-stage progression.
2. **Upload CTI Report**: Drag-and-drop file uploader supporting PDF, DOCX, TXT, and MD files, plus a dedicated **Built-in CTI Reports** benchmark section with one-click View, Download, and Analyze capabilities.
3. **Attack Chain Visualization**: Interactive graph with recognizable icons (User, Host, Email, Process, Command, Registry Key, Scheduled Task, C2 Domain, IP, Malware), directional arrows with labels, evidence hover tooltips, entity/stage filters, and JSON/SVG export.
4. **Entity Intelligence**: Searchable and sortable catalog of all extracted entities with confidence indicators, original vs normalized text, attack stages, and evidence sentence viewers.
5. **Relationship Analysis**: Structured table of observed and inferred connections with a validation interface enabling analysts to **Confirm**, **Reject**, or mark **Uncertain** (immediately updating the graph).
6. **MITRE ATT&CK Mapping**: Matrix correlating observed behaviors to official ATT&CK tactics, technique IDs (e.g., T1566, T1059.001, T1547.001, T1486), supporting evidence, and direct links to `attack.mitre.org`.
7. **IOC Intelligence**: Passive extraction of IPv4/IPv6, Domains, URLs, File Hashes (MD5, SHA-1, SHA-256), and Filenames with verification state.
8. **Investigation History**: Historical log of all analyzed reports with rerun, inspect, delete, and JSON/Markdown export capabilities.
9. **Model Evaluation**: Empirical benchmarking calculating true Precision, Recall, F1 score, confusion matrix, and inference speed against annotated ground-truth CTI scenarios.
10. **Settings**: Configurable Transformer checkpoint paths, extraction confidence thresholds, and system telemetry.

---

## Five Built-in CTI Benchmark Scenarios

The platform includes five synthetic security-analysis scenarios located in `data/cti_reports/`:

1. **Report 1 (`cti_report_01_phishing_powershell.txt`)**: Phishing Email and PowerShell-Based Malware Delivery (Sender, User, Attachment, PowerShell process, Registry artifact, Scheduled task, Domain).
2. **Report 2 (`cti_report_02_office_document.txt`)**: Malicious Office Document and Script Execution (Word docm, wscript/cscript child processes, dropped VBS file, staging URL, DNS queries).
3. **Report 3 (`cti_report_03_web_exploitation.txt`)**: Exploitation of a Public-Facing Application (Targeted HTTP requests, vulnerable upload handler, dropped JSP file, Java worker, unconfirmed outbound IP connection).
4. **Report 4 (`cti_report_04_ransomware_activity.txt`)**: Ransomware Preparation and Impact (Finance workstation, executable launch, vssadmin shadow copy deletion attempt, .locked files, ransom note).
5. **Report 5 (`cti_report_05_remote_access.txt`)**: Suspicious Remote Access and Possible Data Exfiltration (Off-hours authentication, PowerShell backup directory access, archive creation, outbound 120MB network transfer).

---

## Installation & Setup Instructions

### Prerequisites
- **Python**: 3.12+ (ensure Python is added to system PATH)
- **Node.js**: v18+ (tested on Node v25 / v20)
- **Git** (optional)

---

### Step 1: Backend Setup (Windows PowerShell)

Open PowerShell and navigate to the project directory:

```powershell
cd "c:\Users\inbav\Downloads\cti attack chain\backend"

# (Optional) Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install -r requirements.txt

# Seed the database and index the 5 benchmark scenarios
python init_db.py

# Start the FastAPI backend server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API documentation will be accessible at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Step 2: Frontend Setup (Windows PowerShell)

In a second PowerShell terminal:

```powershell
cd "c:\Users\inbav\Downloads\cti attack chain\frontend"

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser at: **[http://localhost:5173](http://localhost:5173)**

---

### Linux / macOS Native Installation

```bash
# Terminal 1: Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

## Database Configuration (PostgreSQL & SQLite)

The platform supports both **PostgreSQL** (production) and **SQLite** (out-of-the-box local operation).

### Running with PostgreSQL:
1. Create a database in your local or remote PostgreSQL instance:
   ```sql
   CREATE DATABASE cti_db;
   ```
2. Copy `.env.example` to `.env` in the project root:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/cti_db
   ```
3. Re-run `python init_db.py` to create the schema and index the initial reports.

### Running with SQLite (Zero Configuration):
If `DATABASE_URL` is omitted, the platform defaults automatically to:
```env
DATABASE_URL=sqlite:///./cti_platform.db
```

---

## Configuring a Trained Transformer Checkpoint

By default, the platform includes a hybrid CTI inference engine:
1. **Local Trained Checkpoint**: If a fine-tuned model (e.g., CTI-BERT or RoBERTa-CTI) is placed in `models/cti_transformer/` (with `config.json` and model weights), it is automatically prioritized.
2. **Pretrained Adapter**: Configurable in `.env` or the UI Settings page via `MODEL_CHECKPOINT=dslim/bert-base-NER`.
3. **CTI Syntactic & Regex Engine**: Always active to extract specialized cyber entities (registry keys, scheduled tasks, IP ranges, hash signatures, process cmdlines) without requiring external paid APIs.

To configure your own fine-tuned model:
```bash
# Place your model files into:
# models/cti_transformer/
#   ├── config.json
#   ├── model.safetensors (or pytorch_model.bin)
#   ├── tokenizer_config.json
#   └── vocab.txt
```
Then navigate to **Settings** in the web interface to verify the active checkpoint.

---

## Running Automated Tests

Run the comprehensive pytest suite verifying parsing, entity extraction, relationship validation, graph reconstruction, and error handling across all five scenarios:

```powershell
cd backend
python -m pytest tests/ -v
```

All 11 automated test suites will execute and validate the pipeline end-to-end.

---

## Security & Operational Safeguards

- **Untrusted Input Handling**: Uploaded reports are strictly treated as passive text. Extracted URLs are never contacted, executables are never launched, and commands are never executed.
- **Path Traversal Protection**: Upload filenames are sanitized and assigned cryptographically secure UUID prefixes.
- **Defanged IOC Display**: Suspicious network destinations can be inspected without trigger risks.
- **Auditability**: Analyst validations (confirmed, rejected, uncertain) are tracked with previous values in persistent database audit logs.
