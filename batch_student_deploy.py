#!/usr/bin/env python3
"""
Batch Student Deployment Script for Olympics PWA
Deploys students with email/password pairs to Supabase via the admin API
"""

import requests
import json
import csv
import sys
from typing import List, Dict, Any
from getpass import getpass

# Configuration
API_BASE_URL = "http://localhost:8080"  # Update if API is running elsewhere
BATCH_ENDPOINT = f"{API_BASE_URL}/admin/batch-register-students"
LOGIN_ENDPOINT = f"{API_BASE_URL}/auth/login"

def login_admin() -> str:
    """Login as admin and get authentication token"""
    print("🔐 Admin Login Required")
    email = input("Admin email: ")
    password = getpass("Admin password: ")
    
    try:
        response = requests.post(LOGIN_ENDPOINT, json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Admin login successful")
                return data['data']['access_token']
        
        print("❌ Admin login failed:", response.json().get('message', 'Unknown error'))
        sys.exit(1)
        
    except requests.RequestException as e:
        print(f"❌ Connection error: {e}")
        sys.exit(1)

def load_students_from_csv(csv_file: str) -> List[Dict[str, str]]:
    """
    Load student data from CSV file
    Expected columns: email, username, user_program, password
    """
    students = []
    
    try:
        with open(csv_file, 'r', newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            # Validate required columns
            required_cols = ['email', 'username', 'user_program']
            if not all(col in reader.fieldnames for col in required_cols):
                print(f"❌ CSV must have columns: {required_cols}")
                print(f"Found columns: {reader.fieldnames}")
                sys.exit(1)
            
            for row_num, row in enumerate(reader, start=2):
                # Validate required fields
                if not all(row.get(col, '').strip() for col in required_cols):
                    print(f"⚠️  Skipping row {row_num}: Missing required fields")
                    continue
                
                students.append({
                    'email': row['email'].strip(),
                    'username': row['username'].strip(), 
                    'user_program': row['user_program'].strip(),
                    'password': row.get('password', '').strip()  # Optional
                })
        
        print(f"📋 Loaded {len(students)} students from {csv_file}")
        return students
        
    except FileNotFoundError:
        print(f"❌ File not found: {csv_file}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        sys.exit(1)

def load_students_from_json(json_file: str) -> List[Dict[str, str]]:
    """
    Load student data from JSON file
    Expected format: [{"email": "...", "username": "...", "user_program": "...", "password": "..."}]
    """
    try:
        with open(json_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        if not isinstance(data, list):
            print("❌ JSON must contain an array of student objects")
            sys.exit(1)
        
        students = []
        for i, student in enumerate(data):
            required_fields = ['email', 'username', 'user_program']
            if not all(field in student for field in required_fields):
                print(f"⚠️  Skipping student {i+1}: Missing required fields")
                continue
            
            students.append({
                'email': student['email'].strip(),
                'username': student['username'].strip(),
                'user_program': student['user_program'].strip(),
                'password': student.get('password', '').strip()
            })
        
        print(f"📋 Loaded {len(students)} students from {json_file}")
        return students
        
    except FileNotFoundError:
        print(f"❌ File not found: {json_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON format: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading JSON: {e}")
        sys.exit(1)

def deploy_students_batch(students: List[Dict[str, str]], admin_token: str, use_individual_passwords: bool = False) -> Dict[str, Any]:
    """Deploy students using batch registration API"""
    
    if use_individual_passwords:
        # Deploy one by one with individual passwords
        print("🚀 Deploying students with individual passwords...")
        successful = []
        failed = []
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        for student in students:
            try:
                if not student.get('password'):
                    failed.append({
                        "email": student['email'],
                        "error": "No password provided for individual deployment"
                    })
                    continue
                
                response = requests.post(
                    f"{API_BASE_URL}/admin/add-student",
                    headers=headers,
                    json={
                        "email": student['email'],
                        "username": student['username'],
                        "user_program": student['user_program'],
                        "temporary_password": student['password']
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        successful.append({
                            "email": student['email'],
                            "username": student['username'],
                            "password": student['password']
                        })
                    else:
                        failed.append({
                            "email": student['email'],
                            "error": result.get('message', 'Unknown error')
                        })
                else:
                    failed.append({
                        "email": student['email'],
                        "error": f"HTTP {response.status_code}"
                    })
                    
            except Exception as e:
                failed.append({
                    "email": student['email'],
                    "error": str(e)
                })
        
        return {
            "success": True,
            "data": {
                "successful": successful,
                "failed": failed,
                "total_processed": len(students)
            }
        }
    
    else:
        # Use batch endpoint with default password
        default_password = input("Enter default password for all students (or press Enter for 'Olympics2024!'): ").strip()
        if not default_password:
            default_password = "Olympics2024!"
        
        print(f"🚀 Deploying {len(students)} students with password: {default_password}")
        
        # Remove password field from students for batch endpoint
        batch_students = [
            {k: v for k, v in student.items() if k != 'password'}
            for student in students
        ]
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        try:
            response = requests.post(
                BATCH_ENDPOINT,
                headers=headers,
                json={
                    "students": batch_students,
                    "default_password": default_password
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Batch deployment failed: HTTP {response.status_code}")
                print(response.text)
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except requests.RequestException as e:
            print(f"❌ Connection error: {e}")
            return {"success": False, "error": str(e)}

def save_deployment_results(results: Dict[str, Any], output_file: str):
    """Save deployment results to file for record keeping"""
    try:
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(results, file, indent=2, default=str)
        print(f"📄 Results saved to: {output_file}")
    except Exception as e:
        print(f"⚠️  Could not save results: {e}")

def main():
    print("🏃‍♂️ Olympics PWA - Batch Student Deployment Tool")
    print("=" * 50)
    
    # Get input file
    if len(sys.argv) < 2:
        print("Usage: python batch_student_deploy.py <students_file.csv|students_file.json> [options]")
        print("\nOptions:")
        print("  --individual-passwords    Use individual passwords from file (requires password column)")
        print("  --output results.json     Save results to file")
        print("\nCSV Format:")
        print("  email,username,user_program,password")
        print("  student1@university.ca,student1,Computer Science,TempPass123")
        print("\nJSON Format:")
        print('  [{"email": "...", "username": "...", "user_program": "...", "password": "..."}]')
        sys.exit(1)
    
    input_file = sys.argv[1]
    use_individual_passwords = '--individual-passwords' in sys.argv
    
    # Determine output file
    output_file = None
    if '--output' in sys.argv:
        try:
            output_index = sys.argv.index('--output')
            output_file = sys.argv[output_index + 1]
        except (ValueError, IndexError):
            print("❌ --output requires a filename")
            sys.exit(1)
    
    # Load students
    if input_file.endswith('.csv'):
        students = load_students_from_csv(input_file)
    elif input_file.endswith('.json'):
        students = load_students_from_json(input_file)
    else:
        print("❌ Input file must be .csv or .json")
        sys.exit(1)
    
    if not students:
        print("❌ No valid students found in input file")
        sys.exit(1)
    
    # Check for individual passwords if requested
    if use_individual_passwords:
        missing_passwords = [s['email'] for s in students if not s.get('password')]
        if missing_passwords:
            print(f"❌ Individual passwords requested but {len(missing_passwords)} students missing passwords:")
            for email in missing_passwords[:5]:  # Show first 5
                print(f"   - {email}")
            if len(missing_passwords) > 5:
                print(f"   ... and {len(missing_passwords) - 5} more")
            sys.exit(1)
    
    # Login as admin
    admin_token = login_admin()
    
    # Deploy students
    print("\n" + "=" * 50)
    results = deploy_students_batch(students, admin_token, use_individual_passwords)
    
    # Show results
    print("\n" + "=" * 50)
    print("📊 DEPLOYMENT RESULTS")
    print("=" * 50)
    
    if results.get('success'):
        data = results['data']
        successful = data.get('successful', [])
        failed = data.get('failed', [])
        
        print(f"✅ Successful: {len(successful)}")
        print(f"❌ Failed: {len(failed)}")
        print(f"📋 Total Processed: {data.get('total_processed', 0)}")
        
        if failed:
            print("\n❌ FAILED DEPLOYMENTS:")
            for failure in failed:
                print(f"   - {failure.get('email', 'Unknown')}: {failure.get('error', 'Unknown error')}")
        
        if successful and not use_individual_passwords:
            print(f"\n🔑 ALL SUCCESSFUL STUDENTS USE PASSWORD: {data.get('default_password', 'Olympics2024!')}")
        
        # Save results if requested
        if output_file:
            save_deployment_results(results, output_file)
            
    else:
        print(f"❌ Deployment failed: {results.get('error', 'Unknown error')}")
        sys.exit(1)
    
    print("\n✅ Deployment complete!")

if __name__ == "__main__":
    main()