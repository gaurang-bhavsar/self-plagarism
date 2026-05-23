# Document Self-Plagiarism Detector

This project is a tool for identifying duplicate or highly similar content within a single document. It supports plain text (`.txt`), Word (`.docx`), and PDF (`.pdf`) files. It can be used either as a command-line interface (CLI) tool or via a local web application.

## How It Works

The detector analyzes a single file internally to find matching segments. The pipeline consists of the following steps:

1. **Text Extraction**: Text is extracted based on the file type:
   - Word files (`.docx`) use `python-docx` to extract text from paragraphs and tables.
   - PDF files use `pdfplumber` to extract text page-by-page.
   - Plain text files are read natively with encoding fallback checks.
2. **Segmentation**: The extracted text is segmented into either sentences (using NLTK's sentence tokenizer or a regular expression fallback) or paragraphs (splitting on blank lines).
3. **Similarity Analysis**: Every segment is compared against every other segment using two approaches:
   - **Near-Exact Matching**: A Jaccard similarity is computed based on lowercase word sets. If the Jaccard similarity exceeds a baseline, a character-level sequence matching ratio (`difflib.SequenceMatcher`) is run to catch close rephrasings.
   - **Semantic Similarity**: The tool builds a TF-IDF vectorizer of all segments and calculates cosine similarity between the segments using `scikit-learn`.
   - **Combined Score**: The highest of the near-exact and semantic scores is used.
4. **Plagiarism Score and Severity**: Flagged segments (whose similarity score meets or exceeds the threshold) are marked. The overall plagiarism score is the percentage of total words in the document that belong to these duplicate/repeated segments. The severity level is categorized as:
   - Low: Less than 10% duplication
   - Medium: 10% to 25% duplication
   - High: Greater than 25% duplication

---

## Directory Structure

```
.
├── backend/
│   ├── app.py             # Flask API server
│   └── requirements.txt   # Backend-specific dependencies
├── frontend/
│   ├── index.html         # User interface HTML
│   ├── app.js             # Frontend interaction logic
│   └── style.css          # Frontend styling
├── check_plagiarism.py    # Core plagiarism detection script / CLI tool
├── requirements.txt       # Project-wide Python dependencies
└── run_project.bat        # Windows batch script to install and run
```

---

## Installation

### Prerequisites
- Python 3.8 or higher is required.

### Install Dependencies
Run the following command to install the required packages:
```bash
pip install -r requirements.txt
```

---

## Running the Project

### Using the Batch Script (Windows Only)
Double-click `run_project.bat` in the root folder. This script will automatically:
1. Verify Python is installed and configured on the system path.
2. Install the dependencies listed in `requirements.txt`.
3. Launch the backend Flask server (serving on `http://127.0.0.1:5000`).
4. Launch a local web server for the frontend (serving on `http://127.0.0.1:8000`).

### Manual Launch (All Platforms)
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the Flask backend server:
   ```bash
   python backend/app.py
   ```
3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```
   *Note: The Flask application is configured to serve the frontend static files automatically on port 5000.*

---

## Command Line Interface (CLI)

You can run the detection script directly from the terminal without launching the web server.

### Usage
```bash
python check_plagiarism.py <path_to_document> [options]
```

### Options
- `-t, --threshold`: Similarity threshold percentage (0-100). Default is `80.0`.
- `-u, --unit`: Segment unit to compare. Options are `sentence` or `paragraph`. Default is `sentence`.
- `-o, --output`: Save the report to a file. Supports `.txt` (plain text report) or `.json` formats.
- `--no-color`: Disable ANSI color coding in terminal output.
- `--semantic-model`: Specify a pre-trained model name from the `sentence-transformers` library (e.g. `all-MiniLM-L6-v2`) to use transformer embeddings instead of TF-IDF vectors for semantic checks. (Note: Requires the `sentence-transformers` package to be installed manually).

### CLI Examples
```bash
# Analyze a PDF document using sentences with a threshold of 80%
python check_plagiarism.py document.pdf

# Analyze a Word document using paragraphs and save the report as JSON
python check_plagiarism.py paper.docx -u paragraph -t 75 -o report.json

# Run without colored terminal output
python check_plagiarism.py draft.txt --no-color
```
