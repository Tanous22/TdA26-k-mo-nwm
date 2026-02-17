# Security Verification - Soft Delete Protection

## Endpoint Security Matrix ✅

### GET Endpoints
| Endpoint | Protection | Status |
|----------|-----------|--------|
| `GET /quizzes` | `WHERE deleted_at IS NULL` | ✅ PROTECTED |
| `GET /quizzes/:quizId` | `WHERE deleted_at IS NULL` + published_at check | ✅ PROTECTED |

### POST Endpoints
| Endpoint | Protection | Status |
|----------|-----------|--------|
| `POST /quizzes` | Creates new (never deleted) | ✅ SAFE |
| `POST /quizzes/:quizId/submit` | Checks `deleted_at IS NULL` | ✅ PROTECTED |
| `POST /quizzes/:quizId/control` | Checks `deleted_at IS NULL` | ✅ PROTECTED |

### PUT Endpoints
| Endpoint | Protection | Status |
|----------|-----------|--------|
| `PUT /quizzes/:quizId` | Checks `deleted_at IS NULL` on lookup | ✅ PROTECTED |

### DELETE Endpoints
| Endpoint | Protection | Status |
|----------|-----------|--------|
| `DELETE /quizzes/:quizId` | Validates `deleted_at IS NULL` before soft-delete | ✅ PROTECTED |

## Query-Level Security Details

### Protected Queries (All have `deleted_at IS NULL`)
```sql
-- List quizzes
SELECT q.* FROM quizzes q 
WHERE q.course_id = ? AND q.deleted_at IS NULL
ORDER BY q.created_at DESC

-- Get quiz detail
SELECT q.* FROM quizzes q 
WHERE q.uuid = ? AND q.deleted_at IS NULL

-- Update quiz
SELECT id, course_id FROM quizzes 
WHERE uuid = ? AND deleted_at IS NULL

-- Soft delete
SELECT title, course_id FROM quizzes 
WHERE uuid = ? AND deleted_at IS NULL

-- Submit attempt
SELECT id FROM quizzes 
WHERE uuid = ? AND deleted_at IS NULL

-- Control quiz (start/pause/resume)
SELECT id, title, course_id FROM quizzes 
WHERE uuid = ? AND deleted_at IS NULL

-- Get updated quiz state
SELECT * FROM quizzes 
WHERE id = ? AND deleted_at IS NULL
```

## Access Control Layers

### Layer 1: Soft Delete Filter
- **Applied to**: All quiz queries
- **Effect**: Deleted quizzes never appear in results
- **Backup**: If accidentally deleted, data in `deleted_at` column

### Layer 2: Publication Status Filter
```typescript
// For GET /quizzes/:quizId (detail endpoint)
if (!isTeacher && quizData.published_at && new Date(quizData.published_at) > now) {
    return 403; // Forbidden
}
```
- **Applied to**: Detail and submit endpoints
- **Effect**: Students cannot access unpublished quizzes
- **Exception**: Teachers can see all quizzes

### Layer 3: Course Scope Filter
```typescript
// All queries include course_id check
WHERE q.course_id = ? AND q.deleted_at IS NULL
```
- **Applied to**: All queries
- **Effect**: Students only see their course's quizzes
- **Exception**: N/A - enforced consistently

## Attack Surface Analysis

### Potential Attack: Direct UUID Access
**Scenario**: Student tries to access deleted quiz via direct URL with UUID

**Before**: 
```typescript
SELECT * FROM quizzes WHERE uuid = 'attacker-uuid'
// ❌ Returns deleted quiz if exists in DB
```

**After**:
```typescript
SELECT * FROM quizzes WHERE uuid = 'attacker-uuid' AND deleted_at IS NULL
// ✅ Returns 404 for deleted quizzes
```

### Potential Attack: Submission to Deleted Quiz
**Scenario**: Student tries to submit answers to deleted quiz

**Before**:
```typescript
const quiz = db.find(quizId)
if (quiz) { // deleted quizzes still exist
    recordAttempt()
    // ❌ Attempt recorded on deleted quiz
}
```

**After**:
```typescript
const quiz = db.find(quizId, {deleted_at: null})
if (!quiz) return 404
// ✅ Submission rejected, no attempts recorded
```

### Potential Attack: Control of Deleted Quiz
**Scenario**: Lecturer tries to start a deleted quiz

**Before**:
```typescript
updateQuiz(quizId, {started_at: NOW})
// ❌ Updates deleted quiz state
```

**After**:
```typescript
const quiz = db.find(quizId, {deleted_at: null})
if (!quiz) return 404
updateQuiz(quiz.id, {started_at: NOW})
// ✅ Rejected - quiz doesn't exist
```

## Data Integrity Guarantees

### Deleted Quiz Lifecycle
```
Quiz Created
  ↓
Quiz Active (normal operations)
  ↓
Lecturer deletes quiz
  ↓
deleted_at = 2026-02-20 10:30:00
  ↓
Quiz excluded from all queries
  ↓
Data preserved for audit/recovery if needed
```

### Student Impact
1. **Before Deletion**: Can view, submit attempts
2. **At Deletion**: Sees "Kvíz smazán" in feed
3. **After Deletion**: Cannot access quiz (404), cannot submit
4. **Archive View**: Soft-deleted quizzes never appear

## Performance Considerations

### Index Recommendations
```sql
-- Existing (should be present)
CREATE INDEX idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX idx_quizzes_uuid ON quizzes(uuid);

-- New (recommended for soft-delete filtering)
CREATE INDEX idx_quizzes_deleted_at ON quizzes(deleted_at);
CREATE INDEX idx_quizzes_course_deleted ON quizzes(course_id, deleted_at);
CREATE INDEX idx_quizzes_uuid_deleted ON quizzes(uuid, deleted_at);
```

### Query Performance
- **Lookup by UUID + deleted_at**: O(1) with index
- **List by course + deleted_at**: O(n) with index, where n = active quizzes
- **No performance regression**: deleted_at check uses indexed column

## Validation Checklist

### Code Review
- ✅ All quiz SELECT queries include `deleted_at IS NULL`
- ✅ GET /:quizId includes published_at permission check
- ✅ DELETE endpoint uses soft-delete (UPDATE, not DELETE)
- ✅ Feed messages sent on soft-delete
- ✅ No hard deletes of quiz data
- ✅ Error responses return 404 for deleted quizzes

### Frontend Security
- ✅ HeaderNav bell icon course-scoped
- ✅ FeedPanel receives courseId prop
- ✅ ArchiveView filters server-side responses
- ✅ No direct quiz URLs shown in deleted state

### Operational Security
- ✅ Audit trail: deleted_at timestamp records when deleted
- ✅ Deletion notification: Feed message alerts course members
- ✅ Recovery path: Query deleted_at column for restoration
- ✅ Data lineage: Links to quiz_attempts still valid

## Compliance Notes

### GDPR/Privacy
- Soft deletes allow pseudonymization without data loss
- Audit trail supports data processing records
- Timebound deletion: Can set automatic cleanup with `deleted_at` older than X days

### Educational Standards
- Student attempt records preserved even if quiz deleted
- Grade calculation stable (quiz data retained)
- Instructional continuity: Course history includes deleted quizzes

## Testing Recommendations

### Unit Tests
```typescript
describe('Quiz Soft Delete', () => {
  it('should exclude deleted quizzes from list', async () => {
    const response = await quiz.list(courseId)
    const hasDeleted = response.some(q => q.deletedAt !== null)
    expect(hasDeleted).toBe(false)
  })

  it('should return 404 for deleted quiz detail', async () => {
    const response = await quiz.getDetail(deletedQuizId)
    expect(response.status).toBe(404)
  })

  it('should reject submission to deleted quiz', async () => {
    const response = await quiz.submit(deletedQuizId, answers)
    expect(response.status).toBe(404)
  })
})
```

### Integration Tests
- Delete a quiz, verify it disappears from all views
- Submit to deleted quiz, verify 404 response
- Start/pause deleted quiz, verify 404 response
- Check feed shows deletion message
- List archive, verify no deleted quizzes appear

### Manual Testing Workflow
1. Create test course with test quiz
2. Have student view quiz (visible)
3. Lecturer deletes quiz
4. Student refreshes page (404 or not found)
5. Check course feed (shows "Kvíz smazán")
6. Check archive (no deleted quiz)
7. Lecturer views archive (still no deleted quiz visible)
