#!/usr/bin/env python3
import os
import sys
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add root workspace directory to sys.path so we can import from check_plagiarism.py
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

try:
    from check_plagiarism import extract_text, segment_text, calculate_similarities, get_severity
except ImportError as e:
    print(f"Error importing modules from root check_plagiarism.py: {e}", file=sys.stderr)
    sys.exit(1)

# Initialize Flask with frontend folder as static assets directory
app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)  # Enable CORS for cross-origin development setups

@app.route('/')
def index():
    """Serves the main frontend index.html page."""
    return app.send_static_file('index.html')

@app.route('/api/detect', methods=['POST'])
def detect_plagiarism():
    """
    Endpoint to receive an uploaded file and parameters to detect self-plagiarism.
    Expects multipart/form-data:
      - file: The document file (.txt, .docx, .pdf)
      - threshold: The similarity threshold (float, default: 80.0)
      - unit: The segmentation unit ('sentence' or 'paragraph', default: 'sentence')
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file field in request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    # Get configuration arguments
    try:
        threshold = float(request.form.get('threshold', 80.0))
        if not (0.0 <= threshold <= 100.0):
            return jsonify({'success': False, 'error': 'Threshold must be between 0 and 100'}), 400
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid threshold value. Must be a number.'}), 400

    unit = request.form.get('unit', 'sentence').lower()
    if unit not in ['sentence', 'paragraph']:
        return jsonify({'success': False, 'error': "Unit must be either 'sentence' or 'paragraph'"}), 400

    # Extract extension and write to a temp file preserving the extension
    # check_plagiarism needs the extension to determine the parser type
    original_filename = file.filename
    _, ext = os.path.splitext(original_filename.lower())
    
    temp_fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(temp_fd)  # Close the file descriptor so we can write to it via save()

    try:
        # Save uploaded file
        file.save(temp_path)
        
        # 1. Parse and extract text
        text = extract_text(temp_path)
        
        # 2. Segment text
        segments = segment_text(text, unit)
        if not segments:
            return jsonify({'success': False, 'error': 'Document contains no extractable text or is empty.'}), 400

        total_segments = len(segments)

        # 3. Handle documents with 1 or fewer units
        if total_segments <= 1:
            return jsonify({
                'success': True,
                'filename': original_filename,
                'unit': unit,
                'total_segments': total_segments,
                'threshold': threshold,
                'overall_score': 0.0,
                'severity': 'Low',
                'flagged_pairs_count': 0,
                'flagged_pairs': [],
                'notice': 'Document contains 1 or fewer units. No comparative analysis can be performed.'
            })

        # 4. Perform analysis
        flagged_pairs, overall_score, _ = calculate_similarities(segments, threshold, use_semantic_model=True)
        severity = get_severity(overall_score)
        
        # Format pairs for response
        formatted_pairs = []
        for pair in flagged_pairs:
            formatted_pairs.append({
                'index1': pair['index1'],
                'label1': pair['label1'],
                'text1': pair['text1'],
                'index2': pair['index2'],
                'label2': pair['label2'],
                'text2': pair['text2'],
                'near_exact_score': pair['near_exact_score'] * 100.0,
                'semantic_score': pair['semantic_score'] * 100.0,
                'combined_score': pair['combined_score'] * 100.0
            })
            
        return jsonify({
            'success': True,
            'filename': original_filename,
            'unit': unit,
            'total_segments': total_segments,
            'threshold': threshold,
            'overall_score': overall_score * 100.0,
            'severity': severity,
            'flagged_pairs_count': len(formatted_pairs),
            'flagged_pairs': formatted_pairs
        })

    except Exception as e:
        return jsonify({'success': False, 'error': f"Processing failed: {str(e)}"}), 500
        
    finally:
        # Secure cleanup
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

if __name__ == '__main__':
    # Start the local development server
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting server on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=True)
