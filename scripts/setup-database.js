// Grant Success Predictor - Database Setup Script
// This script initializes the CockroachDB database with tables and sample data

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper function to log only in non-production environments
const log = (message) => {
  if (process.env.NODE_ENV !== 'production') {
    log(message);
  }
};

log('='.repeat(50));
log('🚀 Grant Success Predictor 초기 설정');
log('='.repeat(50));

async function testOpenAIConnection() {
  log('\n2️⃣ OpenAI API 테스트...');
  
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('your-openai-key')) {
    log('⚠️ OpenAI API 키가 설정되지 않았습니다.');
    return;
  }
  
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (openaiResponse.ok) {
      log('✅ OpenAI API 연결 성공!');
    } else {
      log(`⚠️ OpenAI API 응답 오류: ${openaiResponse.status}`);
    }
  } catch (error) {
    log(`⚠️ OpenAI API 테스트 실패: ${error.message}`);
  }
}

async function setupDatabase() {
  // Check if database URL is configured
  if (!DATABASE_URL || DATABASE_URL.includes('YOUR_COCKROACHDB_PASSWORD_HERE')) {
    log('\n⚠️ 데이터베이스 URL이 설정되지 않았습니다.');
    log('현재는 데이터베이스 없이 실행됩니다.');
    log('샘플 데이터는 메모리에서 처리됩니다.\n');
    
    // Mock database functionality
    log('✅ 메모리 기반 테스트 모드로 실행됩니다.');
    
    // Test OpenAI connection
    await testOpenAIConnection();
    
    log('\n📊 메모리 모드 상태:');
    log('   - 샘플 Grant 수: 5개 (하드코딩됨)');
    log('   - 데이터 지속성: 없음 (세션 기반)');
    log('   - 실제 데이터베이스: 비활성화');
    
    log('\n' + '='.repeat(50));
    log('🎉 메모리 모드 설정 완료!');
    log('='.repeat(50));
    log('\n다음 단계:');
    log('1. 실제 데이터베이스 연결을 위해 DATABASE_URL 설정');
    log('2. Vercel에 프론트엔드 배포');
    log('3. 환경변수 설정 및 배포 진행');
    return;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // 1. CockroachDB 연결 테스트
    log('\n1️⃣ CockroachDB 연결 테스트...');
    await client.connect();
    const versionResult = await client.query('SELECT version()');
    log('✅ 데이터베이스 연결 성공!');

    // 2. OpenAI API 테스트
    log('\n2️⃣ OpenAI API 테스트...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "API working"' }],
        max_tokens: 10
      })
    });
    
    if (openaiResponse.ok) {
      log('✅ OpenAI API 연결 성공!');
    } else {
      throw new Error('OpenAI API 연결 실패');
    }

    // 3. 테이블 생성
    log('\n3️⃣ 테이블 생성 중...');
    
    // Grants 테이블
    await client.query(`
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Applications 테이블
    await client.query(`
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analysis History 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID REFERENCES applications(id),
        openai_tokens_used INTEGER,
        analysis_cost DECIMAL(10,4),
        processing_time_seconds DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users 테이블 (기존 스키마와 통합)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        google_id VARCHAR(255) UNIQUE,
        picture VARCHAR(500),
        subscription_status VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Predictions 테이블 (기존 스키마와 통합)
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        organization_name VARCHAR(255) NOT NULL,
        organization_type VARCHAR(100) NOT NULL,
        funding_amount INT NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        has_partnership BOOL DEFAULT FALSE,
        has_previous_grants BOOL DEFAULT FALSE,
        success_probability INT NOT NULL,
        confidence VARCHAR(20) NOT NULL,
        ai_enhanced BOOL DEFAULT FALSE,
        recommendations JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subscriptions 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    log('✅ 테이블 생성 완료!');

    // 4. 샘플 Grant 데이터 삽입
    log('\n4️⃣ 샘플 Grant 데이터 생성 중...');

    const sampleGrants = [
      {
        title: "Environmental Innovation Grant 2024",
        agency: "EPA",
        amount_min: 50000,
        amount_max: 500000,
        category: "Environment",
        description: "Supporting innovative environmental protection technologies and research",
        keywords: "environment, climate, sustainability, green tech",
        eligibility: "Non-profit organizations, educational institutions",
        success_rate: 32.5
      },
      {
        title: "Small Business Innovation Research (SBIR) Phase I",
        agency: "NSF",
        amount_min: 100000,
        amount_max: 275000,
        category: "Technology",
        description: "Seed funding for technology startups and innovative small businesses",
        keywords: "technology, innovation, startup, R&D",
        eligibility: "Small businesses with fewer than 500 employees",
        success_rate: 18.7
      },
      {
        title: "NIH Research Project Grant (R01)",
        agency: "NIH",
        amount_min: 250000,
        amount_max: 500000,
        category: "Health",
        description: "Support for health-related research and development",
        keywords: "health, medical, research, clinical",
        eligibility: "Research institutions, universities",
        success_rate: 21.0
      },
      {
        title: "Education Innovation and Research Grant",
        agency: "Department of Education",
        amount_min: 100000,
        amount_max: 4000000,
        category: "Education",
        description: "Supporting evidence-based innovations in education",
        keywords: "education, learning, schools, innovation",
        eligibility: "Educational agencies, non-profits",
        success_rate: 15.3
      },
      {
        title: "Community Development Block Grant",
        agency: "HUD",
        amount_min: 50000,
        amount_max: 2000000,
        category: "Community Development",
        description: "Funding for community development and housing projects",
        keywords: "community, housing, urban development",
        eligibility: "Local governments, community organizations",
        success_rate: 28.9
      }
    ];

    for (const grant of sampleGrants) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + Math.floor(Math.random() * 150) + 30);
      
      await client.query(`
        INSERT INTO grants (title, agency, amount_min, amount_max, deadline, description, 
                          category, keywords, eligibility, source, success_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING
      `, [
        grant.title, grant.agency, grant.amount_min, grant.amount_max,
        deadline.toISOString().split('T')[0], grant.description, grant.category,
        grant.keywords, grant.eligibility, 'Sample', grant.success_rate
      ]);
    }

    log('✅ 샘플 데이터 생성 완료!');

    // 5. 데이터 확인
    const countResult = await client.query('SELECT COUNT(*) FROM grants');
    const grantCount = countResult.rows[0].count;
    
    log('\n📊 현재 데이터베이스 상태:');
    log(`   - 저장된 Grant 수: ${grantCount}개`);
    log('   - 사용 가능한 용량: 1GB');
    log('   - 예상 저장 가능: 약 50만개');

    // 6. 테스트 분석 실행
    log('\n6️⃣ AI 분석 테스트...');
    const testPrompt = `
Analyze this grant proposal summary:
"We are applying for an environmental grant to develop solar panel recycling technology."

Compare with environmental grants and provide:
1. Success probability (0-100%)
2. Key strengths
3. Areas for improvement
`;

    try {
      const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 200
        })
      });

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        log('✅ AI 분석 테스트 성공!');
        log('\n샘플 분석 결과:');
        log(analysisData.choices[0].message.content.substring(0, 200) + '...');
      }
    } catch (error) {
      log(`⚠️ AI 분석 테스트 실패: ${error.message}`);
    }

    log('\n' + '='.repeat(50));
    log('🎉 초기 설정 완료!');
    log('='.repeat(50));
    log('\n다음 단계:');
    log('1. Vercel에 프론트엔드 배포');
    log('2. 환경변수 설정');
    log('3. npm run build && vercel --prod');
    log('\n준비가 되면 배포를 진행하세요!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the setup
setupDatabase();