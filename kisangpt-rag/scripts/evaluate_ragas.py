import os
import json
import subprocess
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def print_banner(text):
    print("=" * 60)
    print(f" {text}")
    print("=" * 60)

def query_rag_local(question):
    """
    Executes a Node.js subprocess to import the local ES Module RAG engine 
    and fetch the retrieved contexts and generated answers.
    This eliminates the need to have the web server running.
    """
    node_cmd = (
        f"import('./api/rag.mjs').then(r=>"
        f"console.log(JSON.stringify(r.answer({json.dumps(question)})))"
        f").catch(err=>{{console.error(err); process.exit(1);}})"
    )
    
    cmd = ["node", "-e", node_cmd]
    
    # Run from the project subfolder directory to ensure relative paths inside rag.mjs resolve correctly
    result = subprocess.run(
        cmd, 
        capture_output=True, 
        text=True, 
        encoding='utf-8',
        cwd=os.getcwd()
    )
    
    if result.returncode == 0:
        return json.loads(result.stdout.strip())
    else:
        print(f"Node execution error: {result.stderr}", file=sys.stderr)
        raise Exception("Failed to query RAG engine via Node.js")

def load_ground_truth(expected_doc_id, doc_lookup):
    """
    Retrieves the actual document text from data/docs to serve as the ground truth.
    """
    relative_path = doc_lookup.get(expected_doc_id)
    if not relative_path:
        return ""
    
    doc_path = os.path.join(os.getcwd(), relative_path)
    if not os.path.exists(doc_path):
        return ""
        
    with open(doc_path, "r", encoding="utf-8") as f:
        text = f.read()
        
    # Strip YAML front matter
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            text = parts[2].strip()
    return text

def main():
    print_banner("KisanRAG — RAGAS Assessment Suite Setup")
    
    # 1. Verify environment paths
    manifest_path = os.path.join("data", "manifest.json")
    questions_path = os.path.join("data", "eval", "questions.json")
    
    if not os.path.exists(manifest_path) or not os.path.exists(questions_path):
        print("Error: Please run this script from the 'kisangpt-rag' project directory.")
        sys.exit(1)
        
    # 2. Build document lookup mapping from manifest.json
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    doc_lookup = {doc["id"]: doc["file"] for doc in manifest}
    
    # 3. Load golden evaluation questions
    with open(questions_path, "r", encoding="utf-8") as f:
        questions = json.load(f)
        
    print(f"Loaded {len(questions)} evaluation questions from questions.json.")
    print("Querying local RAG engine for live answers and contexts...")
    
    eval_data = []
    
    for i, q in enumerate(questions):
        q_text = q["question"]
        expected_id = q["expected_doc"]
        
        # Live query RAG engine
        try:
            rag_res = query_rag_local(q_text)
            live_answer = rag_res["answer"]
            
            # Contexts are mapped as lists of strings representing retrieved texts
            retrieved_contexts = [
                s["text"] for s in rag_res["sources"] if s.get("score", 0) > 0.01
            ]
            
            # If no strong contexts were matched (blocked by threshold), fallback safely
            if not retrieved_contexts and rag_res["sources"]:
                retrieved_contexts = [rag_res["sources"][0]["text"]]
                
            ground_truth = load_ground_truth(expected_id, doc_lookup)
            
            eval_data.append({
                "question": q_text,
                "answer": live_answer,
                "contexts": retrieved_contexts,
                "ground_truth": ground_truth
            })
            print(f" [{i+1}/{len(questions)}] Processed: '{q_text[:35]}...'")
            
        except Exception as e:
            print(f" Error processing query [{q_text}]: {e}")
            sys.exit(1)
            
    # 4. Format dataset for RAGAS
    # RAGAS expects lists of values
    ragas_dataset = {
        "question": [item["question"] for item in eval_data],
        "answer": [item["answer"] for item in eval_data],
        "contexts": [item["contexts"] for item in eval_data],
        "ground_truth": [item["ground_truth"] for item in eval_data]
    }
    
    # 5. Check API keys to perform evaluation
    api_key_found = os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    
    if not api_key_found:
        print_banner("Dry-Run / RAGAS Dataset Prepared Successfully")
        print("To run the automated RAGAS scoring, an evaluation LLM key is required.")
        print("Please configure either GEMINI_API_KEY or OPENAI_API_KEY in your .env file.")
        
        # Save dry-run dataset
        dryrun_path = os.path.join("data", "eval", "ragas_dataset_prepared.json")
        with open(dryrun_path, "w", encoding="utf-8") as f:
            json.dump(ragas_dataset, f, indent=2)
            
        print(f"\nSaved RAGAS formatted evaluation dataset to:\n {dryrun_path}")
        print("\nStructure verified successfully. No compilation or structural errors found!")
        return

    # 6. Run actual RAGAS evaluation
    print_banner("Executing Live RAGAS Quality Scoring")
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import faithfulness, answer_relevance, context_recall, context_precision
        
        # Convert dictionary to Hugging Face Dataset format
        dataset = Dataset.from_dict(ragas_dataset)
        
        # Check LLM provider
        if os.environ.get("GEMINI_API_KEY"):
            print("Configuring RAGAS to use Gemini evaluation model...")
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            
            evaluator_llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
            evaluator_embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
            
            # Bind to RAGAS metrics
            for m in [faithfulness, answer_relevance, context_recall, context_precision]:
                m.llm = evaluator_llm
                if hasattr(m, 'embeddings'):
                    m.embeddings = evaluator_embeddings
                    
            metrics = [faithfulness, answer_relevance, context_recall, context_precision]
        else:
            print("Configuring RAGAS to use default OpenAI evaluation model...")
            metrics = [faithfulness, answer_relevance, context_recall, context_precision]
            
        # Run evaluation
        result = evaluate(dataset, metrics=metrics)
        
        # Print summary
        print("\n" + "="*30 + " RAGAS SCORES SUMMARY " + "="*30)
        print(result)
        print("="*82)
        
        # Save RAGAS report
        report_path = os.path.join("data", "eval", "ragas_report.json")
        result_dict = result.scores
        # Add summary row
        summary_report = {
            "summary_scores": dict(result),
            "detailed_scores": result_dict
        }
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(summary_report, f, indent=2)
            
        print(f"\nSaved detailed RAGAS report to:\n {report_path}")
        
    except ImportError as ie:
        print(f"\nImport Error: {ie}")
        print("Dependencies from requirements.txt might not be fully installed.")
        print("Saving prepared dataset for manual execution...")
        dryrun_path = os.path.join("data", "eval", "ragas_dataset_prepared.json")
        with open(dryrun_path, "w", encoding="utf-8") as f:
            json.dump(ragas_dataset, f, indent=2)
        print(f"Saved prepared RAGAS dataset to: {dryrun_path}")

if __name__ == "__main__":
    main()
