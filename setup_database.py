import os
import psycopg2
import openai
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv('.env.local')
DATABASE_URL = os.getenv('DATABASE_URL')
openai.api_key = os.getenv('OPENAI_API_KEY')

print("="*50)
print("Grant Success Predictor Initial Setup")
print("="*50)

# 1. CockroachDB 연결 테스트
try:
    print("\n[1] Testing CockroachDB connection...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT version()")
    print("[OK] Database connection successful!")
except Exception as e:
    print(f"[ERROR] Database connection failed: {e}")
    print("Please check your DATABASE_URL!")
    exit(1)

# 2. OpenAI API 테스트
try:
    print("\n[2] Testing OpenAI API...")
    # OpenAI 라이브러리 버전에 따른 호출 방식
    try:
        # 새로운 버전 (1.0+)
        from openai import OpenAI
        client = OpenAI(api_key=openai.api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'API working'"}],
            max_tokens=10
        )
        print("[OK] OpenAI API connection successful! (v1.0+)")
    except:
        # 이전 버전 (0.x)
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'API working'"}],
            max_tokens=10
        )
        print("[OK] OpenAI API connection successful! (v0.x)")
except Exception as e:
    print(f"[ERROR] OpenAI API connection failed: {e}")
    print("Please check your OPENAI_API_KEY!")
    exit(1)

# 3. 테이블 생성
print("\n[3] Creating tables...")

# Grants 테이블
cursor.execute("""
    CREATE TABLE IF NOT EXISTS grants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        agency VARCHAR(255),
        amount_min DECIMAL(15,2),
        amount_max DECIMAL(15,2),
        deadline DATE,
        description TEXT,
        category VARCHAR(100),
        keywords TEXT,
        eligibility TEXT,
        source VARCHAR(50),
        url VARCHAR(500),
        success_rate DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Applications 테이블
cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email VARCHAR(255),
        organization_name VARCHAR(255),
        grant_id UUID REFERENCES grants(id),
        proposal_file_name VARCHAR(255),
        proposal_text TEXT,
        success_probability DECIMAL(5,2),
        match_score DECIMAL(5,2),
        strengths TEXT,
        weaknesses TEXT,
        recommendations TEXT,
        ai_analysis JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Analysis History 테이블
cursor.execute("""
    CREATE TABLE IF NOT EXISTS analysis_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID REFERENCES applications(id),
        openai_tokens_used INTEGER,
        analysis_cost DECIMAL(10,4),
        processing_time_seconds DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Users 테이블 (Next.js 앱과 호환)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        google_id VARCHAR(255) UNIQUE,
        picture VARCHAR(500),
        subscription_status VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Predictions 테이블 (Next.js 앱과 호환)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        organization_name VARCHAR(255) NOT NULL,
        organization_type VARCHAR(100) NOT NULL,
        funding_amount INTEGER NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        has_partnership BOOLEAN DEFAULT FALSE,
        has_previous_grants BOOLEAN DEFAULT FALSE,
        success_probability INTEGER NOT NULL,
        confidence VARCHAR(20) NOT NULL,
        ai_enhanced BOOLEAN DEFAULT FALSE,
        recommendations JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Subscriptions 테이블 (Next.js 앱과 호환)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

conn.commit()
print("[OK] Tables created successfully!")

# 4. 샘플 Grant 데이터 삽입
print("\n[4] Creating sample Grant data...")

sample_grants = [
    {
        "title": "Environmental Innovation Grant 2024",
        "agency": "EPA",
        "amount_min": 50000,
        "amount_max": 500000,
        "category": "Environment",
        "description": "Supporting innovative environmental protection technologies and research",
        "keywords": "environment, climate, sustainability, green tech",
        "eligibility": "Non-profit organizations, educational institutions",
        "success_rate": 32.5,
        "url": "https://www.epa.gov/grants"
    },
    {
        "title": "Small Business Innovation Research (SBIR) Phase I",
        "agency": "NSF",
        "amount_min": 100000,
        "amount_max": 275000,
        "category": "Technology",
        "description": "Seed funding for technology startups and innovative small businesses",
        "keywords": "technology, innovation, startup, R&D",
        "eligibility": "Small businesses with fewer than 500 employees",
        "success_rate": 18.7,
        "url": "https://www.nsf.gov/sbir"
    },
    {
        "title": "NIH Research Project Grant (R01)",
        "agency": "NIH",
        "amount_min": 250000,
        "amount_max": 500000,
        "category": "Health",
        "description": "Support for health-related research and development",
        "keywords": "health, medical, research, clinical",
        "eligibility": "Research institutions, universities",
        "success_rate": 21.0,
        "url": "https://grants.nih.gov"
    },
    {
        "title": "Education Innovation and Research Grant",
        "agency": "Department of Education",
        "amount_min": 100000,
        "amount_max": 4000000,
        "category": "Education",
        "description": "Supporting evidence-based innovations in education",
        "keywords": "education, learning, schools, innovation",
        "eligibility": "Educational agencies, non-profits",
        "success_rate": 15.3,
        "url": "https://www.ed.gov/grants"
    },
    {
        "title": "Community Development Block Grant",
        "agency": "HUD",
        "amount_min": 50000,
        "amount_max": 2000000,
        "category": "Community Development",
        "description": "Funding for community development and housing projects",
        "keywords": "community, housing, urban development",
        "eligibility": "Local governments, community organizations",
        "success_rate": 28.9,
        "url": "https://www.hud.gov/cdbg"
    },
    {
        "title": "Arts and Culture Grant Program",
        "agency": "NEA",
        "amount_min": 10000,
        "amount_max": 100000,
        "category": "Arts",
        "description": "Supporting artistic excellence and cultural preservation",
        "keywords": "arts, culture, music, theater, visual arts",
        "eligibility": "Arts organizations, individual artists",
        "success_rate": 24.5,
        "url": "https://www.arts.gov"
    },
    {
        "title": "Clean Energy Innovation Fund",
        "agency": "DOE",
        "amount_min": 500000,
        "amount_max": 5000000,
        "category": "Energy",
        "description": "Advancing clean energy technologies and renewable solutions",
        "keywords": "clean energy, solar, wind, renewable, battery",
        "eligibility": "Research institutions, energy companies",
        "success_rate": 16.8,
        "url": "https://www.energy.gov/grants"
    },
    {
        "title": "Rural Development Grant",
        "agency": "USDA",
        "amount_min": 25000,
        "amount_max": 500000,
        "category": "Agriculture",
        "description": "Supporting rural communities and agricultural innovation",
        "keywords": "rural, agriculture, farming, community development",
        "eligibility": "Rural communities, agricultural businesses",
        "success_rate": 31.2,
        "url": "https://www.usda.gov/rural"
    }
]

inserted_count = 0
for grant in sample_grants:
    deadline = datetime.now() + timedelta(days=random.randint(30, 180))
    try:
        cursor.execute("""
            INSERT INTO grants (title, agency, amount_min, amount_max, deadline, description, 
                              category, keywords, eligibility, source, url, success_rate)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            grant["title"], grant["agency"], grant["amount_min"], grant["amount_max"],
            deadline.date(), grant["description"], grant["category"], 
            grant["keywords"], grant["eligibility"], "Government", grant["url"], grant["success_rate"]
        ))
        if cursor.rowcount > 0:
            inserted_count += 1
    except Exception as e:
        print(f"[WARNING] Failed to insert grant: {grant['title']}: {e}")

conn.commit()
print(f"[OK] {inserted_count} new Grant records added!")

# 5. 데이터 확인
cursor.execute("SELECT COUNT(*) FROM grants")
grant_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM users")
user_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM predictions")
prediction_count = cursor.fetchone()[0]

print(f"\n[DATABASE STATUS]")
print(f"   - Total Grants: {grant_count}")
print(f"   - Total Users: {user_count}")
print(f"   - Total Predictions: {prediction_count}")
print(f"   - Available Storage: 1GB (Free Tier)")
print(f"   - Estimated Capacity: ~500,000 records")

# 6. 연결 정보 저장
print("\n[5] Creating connection info file...")
with open("connection_info.txt", "w", encoding='utf-8') as f:
    f.write("=== Grant Success Predictor Connection Info ===\n\n")
    f.write("CockroachDB:\n")
    f.write(f"- Cluster: army-lioness-14471\n")
    f.write(f"- Region: AWS us-east-1\n")
    f.write(f"- Storage: 1GB Free Tier\n")
    f.write(f"- Total Grants: {grant_count}\n\n")
    f.write("OpenAI:\n")
    f.write(f"- Model: GPT-3.5-turbo / GPT-4\n")
    f.write(f"- API Key: Configured\n\n")
    f.write(f"Created Tables:\n")
    f.write(f"- grants: Grant opportunities ({grant_count} records)\n")
    f.write(f"- applications: User applications\n")
    f.write(f"- analysis_history: Analysis logs\n")
    f.write(f"- users: User accounts\n")
    f.write(f"- predictions: AI prediction records\n")
    f.write(f"- subscriptions: Subscription management\n\n")
    f.write(f"Web Application:\n")
    f.write(f"- Frontend: Next.js 15 (DoNotPay style)\n")
    f.write(f"- Deployment: Vercel\n")
    f.write(f"- Local Testing: http://localhost:3000\n")

print("[OK] connection_info.txt file created")

# 7. 테스트 분석 실행
print("\n[6] Testing AI analysis...")
test_prompt = """
Analyze this grant proposal summary:
"We are applying for an environmental grant to develop solar panel recycling technology."

Compare with environmental grants and provide:
1. Success probability (0-100%)
2. Key strengths
3. Areas for improvement
"""

try:
    # 새로운 버전 (1.0+) 시도
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai.api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": test_prompt}],
            max_tokens=200
        )
        result = response.choices[0].message.content
    except:
        # 이전 버전 (0.x) 시도
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": test_prompt}],
            max_tokens=200
        )
        result = response.choices[0].message.content
    
    print("[OK] AI analysis test successful!")
    print("\nSample analysis result:")
    print(result[:300] + "..." if len(result) > 300 else result)
except Exception as e:
    print(f"[WARNING] AI analysis test failed: {e}")

# 8. 샘플 Grant 목록 출력
print("\n[AVAILABLE GRANTS]")
cursor.execute("""
    SELECT title, agency, amount_min, amount_max, category, success_rate 
    FROM grants 
    ORDER BY success_rate DESC 
    LIMIT 5
""")
grants = cursor.fetchall()
for grant in grants:
    print(f"   - {grant[0]}")
    print(f"     Agency: {grant[1]} | Amount: ${grant[2]:,.0f}-${grant[3]:,.0f}")
    print(f"     Category: {grant[4]} | Success Rate: {grant[5]}%")
    print()

print("\n" + "="*50)
print("SETUP COMPLETE!")
print("="*50)
print("\nNext Steps:")
print("1. Run Next.js app: npm run dev")
print("2. Deploy to Vercel: npm run deploy")
print("3. Configure environment variables (Vercel Dashboard)")
print("\nWeb App Features:")
print("- AI-powered Grant success prediction")
print("- 2M+ Grant database search")
print("- Google OAuth login")
print("- Stripe payment system ($36/3 months)")
print("\nWhen ready, run 'npm run dev' to start local testing!")

cursor.close()
conn.close()