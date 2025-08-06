# 🚨 Incident Response Runbook

## Emergency Contacts
- **On-Call Engineer**: Via PagerDuty rotation
- **Stripe Support**: +1-888-926-2289
- **Vercel Support**: support@vercel.com
- **Database Admin**: DBA team rotation

---

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|------------|---------------|----------|
| **P0** | Complete outage | < 5 minutes | Payment processing down, site unreachable |
| **P1** | Major functionality broken | 15 minutes | >30% users affected, API failures |
| **P2** | Partial outage | 1 hour | <30% users affected, degraded performance |
| **P3** | Minor issues | 4 hours | UI bugs, non-critical features broken |
| **P4** | Cosmetic issues | Next business day | Typos, minor UI inconsistencies |

---

## Escalation Path
1. **L1**: On-call engineer (PagerDuty)
2. **L2**: Team lead
3. **L3**: Engineering manager
4. **L4**: CTO/VP Engineering

---

## Common Issues & Solutions

### 🔴 High Error Rate (>1%)

**Symptoms**: Increased 5xx errors, user complaints, monitoring alerts

**Investigation**:
```bash
# Check application logs
vercel logs --output json | jq '.[] | select(.level=="error")'

# Check error tracking
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/projects/grant-predictor/issues/

# Check current deployments
vercel list --scope grant-predictor
```

**Resolution**:
```bash
# Option 1: Rollback to previous version
vercel rollback --yes

# Option 2: Scale up if resource issue
vercel scale grant-predictor 5

# Option 3: Emergency hotfix
git checkout -b hotfix/emergency
# Make fix
git push origin hotfix/emergency
vercel --prod
```

### 🔴 Database Connection Issues

**Symptoms**: Timeout errors, connection pool exhausted

**Investigation**:
```bash
# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements 
  WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Resolution**:
```bash
# Reset idle connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"

# Increase connection pool (update environment variable)
vercel env add DATABASE_POOL_SIZE 50 production
```

### 🔴 Payment Processing Failures

**Symptoms**: Stripe webhooks failing, checkout errors

**Investigation**:
```bash
# Check Stripe webhook status
curl https://api.stripe.com/v1/webhook_endpoints \
  -u $STRIPE_SECRET_KEY:

# Check recent events
curl https://api.stripe.com/v1/events?limit=10 \
  -u $STRIPE_SECRET_KEY:
```

**Resolution**:
```bash
# Replay failed webhooks
curl -X POST https://api.stripe.com/v1/webhook_endpoints/{id}/replay \
  -u $STRIPE_SECRET_KEY:

# Update webhook endpoint if needed
vercel env add STRIPE_WEBHOOK_SECRET whsec_new_secret production
```

### 🟡 High Response Times

**Symptoms**: Slow page loads, API timeouts

**Investigation**:
```bash
# Check function execution times
vercel logs --output json | jq '.duration' | sort -n | tail -20

# Check CDN cache hit rate
curl -I https://grant-predictor.vercel.app | grep -i cache
```

**Resolution**:
```bash
# Clear CDN cache
vercel --prod --force

# Optimize function memory
# Update vercel.json with increased memory
```

### 🟡 AI Service Degradation

**Symptoms**: Predictions failing, timeout errors

**Investigation**:
```bash
# Check OpenAI status
curl https://status.openai.com/api/v2/status.json

# Check API quota
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Resolution**:
```bash
# Switch to backup AI provider
vercel env add AI_PROVIDER anthropic production

# Implement circuit breaker (update code)
```

---

## Recovery Procedures

### Full Site Recovery
```bash
# 1. Verify all services
curl https://grant-predictor.vercel.app/api/health

# 2. Run smoke tests
npm run test:smoke

# 3. Monitor for 15 minutes
watch -n 30 'curl -s https://grant-predictor.vercel.app/api/health | jq .status'

# 4. Clear incident
# Update status page
# Notify stakeholders
```

### Database Recovery
```bash
# 1. Restore from backup
pg_restore -d $DATABASE_URL backup_latest.dump

# 2. Run migrations
npm run migrate up

# 3. Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscriptions;"
```

### Rollback Procedure
```bash
# 1. List recent deployments
vercel list --limit 10

# 2. Identify last known good deployment
# Look for deployment before issues started

# 3. Rollback
vercel rollback [deployment-url]

# 4. Verify rollback
curl https://grant-predictor.vercel.app/api/health
```

---

## Monitoring Commands

### Real-time Monitoring
```bash
# Watch logs
vercel logs --follow

# Monitor health endpoint
watch -n 10 'curl -s https://grant-predictor.vercel.app/api/health | jq .'

# Check error rate
vercel logs --output json | jq '[.[] | select(.level=="error")] | length'
```

### Performance Monitoring
```bash
# Check response times
for i in {1..10}; do 
  curl -w "@curl-format.txt" -o /dev/null -s https://grant-predictor.vercel.app
done

# Check memory usage
vercel inspect grant-predictor
```

---

## Post-Incident Checklist

- [ ] Incident resolved and verified
- [ ] Root cause identified
- [ ] Immediate fix deployed
- [ ] Monitoring confirms stability
- [ ] Stakeholders notified
- [ ] Post-mortem scheduled
- [ ] Documentation updated
- [ ] Preventive measures identified

---

## Post-Mortem Template

```markdown
## Incident Post-Mortem

**Date**: [YYYY-MM-DD]
**Duration**: [HH:MM]
**Severity**: [P0-P4]
**Services Affected**: [List]

### Timeline
- HH:MM - Initial detection
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

### Root Cause
[Detailed explanation]

### Impact
- Users affected: [number/%]
- Revenue impact: [$amount]
- Data loss: [yes/no]

### Resolution
[Steps taken to resolve]

### Lessons Learned
1. What went well
2. What could be improved
3. Action items

### Prevention
- [ ] Add monitoring for [specific metric]
- [ ] Update runbook with [new procedure]
- [ ] Implement [technical improvement]
```

---

## Quick Reference Card

```bash
# Emergency rollback
vercel rollback --yes

# Scale up immediately
vercel scale grant-predictor 10

# Check all services
curl https://grant-predictor.vercel.app/api/health

# View recent errors
vercel logs --output json | jq '.[] | select(.level=="error")' | head -20

# Database emergency backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Clear CDN cache
vercel --prod --force

# Restart all functions
vercel dev --debug
```

---

**Last Updated**: February 2025  
**Maintained By**: Platform Team  
**Review Frequency**: Monthly