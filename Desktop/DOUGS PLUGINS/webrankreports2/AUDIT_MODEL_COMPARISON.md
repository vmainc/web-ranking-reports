# Claude Model Comparison for Site Audits

## Current Model: Claude Haiku (`claude-3-haiku-20240307`)

### Pricing Comparison (Approximate per 1M tokens)

| Model | Input Cost | Output Cost | Relative Cost |
|-------|-----------|-------------|---------------|
| **Haiku** | $0.25 | $1.25 | **1x** (cheapest) |
| **Sonnet 3.5** | $3 | $15 | **12x** more expensive |
| **Opus** | $15 | $75 | **60x** more expensive |

### Estimated Cost per Audit

For a typical site audit (assuming ~2,000 input tokens, ~2,000 output tokens):
- **Haiku**: ~$0.003 per audit ($0.30 per 100 audits)
- **Sonnet**: ~$0.036 per audit ($3.60 per 100 audits)
- **Opus**: ~$0.18 per audit ($18 per 100 audits)

---

## Pros of Using Haiku (Cheaper Model) ✅

1. **Cost Savings**: 12-60x cheaper than Sonnet/Opus
   - Makes audits affordable for high-volume usage
   - Lower barrier to entry for users

2. **Speed**: Fastest response times
   - Better user experience (quicker results)
   - Can handle more concurrent requests

3. **Sufficient Quality for Structured Tasks**: 
   - Site audits are well-structured with clear prompts
   - Good at following JSON format requirements
   - Adequate for identifying common SEO issues

4. **Scalability**: 
   - Can run more audits without budget concerns
   - Better for bulk/automated audits

---

## Cons of Using Haiku (vs More Expensive Models) ⚠️

1. **Less Nuanced Analysis**:
   - May miss subtle SEO issues
   - Could provide more generic recommendations
   - Less likely to catch edge cases

2. **Reduced Depth**:
   - Recommendations might be less detailed
   - May not explain the "why" as thoroughly
   - Could miss advanced technical issues

3. **Context Understanding**:
   - Smaller context window limits
   - May struggle with very complex site architectures
   - Less sophisticated reasoning for unusual scenarios

4. **Creative Problem-Solving**:
   - More expensive models excel at unique solutions
   - Opus might find issues Haiku misses entirely

---

## When to Upgrade Models

Consider using **Sonnet** or **Opus** if:
- ✅ Users report missing important issues
- ✅ You need more detailed explanations
- ✅ Dealing with very complex/enterprise sites
- ✅ Cost is not a primary concern
- ✅ You want the most comprehensive audit possible

---

## Recommendation

**Haiku is recommended for most use cases** because:
1. Site audits are structured tasks with clear criteria
2. Cost savings enable more frequent audits
3. Most SEO issues are standard and well-known
4. The structured JSON format helps maintain quality

**Consider Sonnet if**:
- Users complain about audit quality
- You want to offer "Premium Audit" (Sonnet) vs "Standard Audit" (Haiku)
- Cost can be passed to users or isn't a concern

---

## Changing the Model

To change the model, edit `server/api/sites/[id]/audit/run.post.ts`:

```typescript
model: 'claude-3-haiku-20240307',  // Cheapest, fastest
// OR
model: 'claude-3-5-sonnet-20241022',  // Mid-range, better quality
// OR
model: 'claude-3-opus-20240229',  // Best quality, most expensive
```

Available models (as of Nov 2024):
- `claude-3-haiku-20240307` - Fastest, cheapest
- `claude-3-5-sonnet-20241022` or `20240620` - Balanced
- `claude-3-sonnet-20240229` - Older Sonnet version
- `claude-3-opus-20240229` - Most capable, expensive

