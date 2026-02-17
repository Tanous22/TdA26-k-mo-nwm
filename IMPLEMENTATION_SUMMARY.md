# Quiz System Implementation Summary

## Overview
Complete implementation of a comprehensive quiz management system with scheduling, publication control, soft deletion, course-specific feeds, and system notifications.

## Core Features Implemented

### 1. **Quiz Lifecycle Management**
- **Published At**: Control when quizzes become visible to students
- **Scheduled Start**: Auto-start quizzes at specified times
- **Duration**: Optional time limits for quiz attempts
- **Pausing**: Lecturers can pause and resume active quizzes
- **Archival**: Quizzes automatically archive after duration expires
- **Soft Deletion**: Deleted quizzes retained in database for audit trail

### 2. **Database Schema**
**New Columns in `quizzes` table:**
- `published_at DATETIME NULL` - When quiz becomes visible to students
- `deleted_at DATETIME NULL` - Soft delete marker

**Query Safety:**
All quiz queries now enforce:
```sql
WHERE deleted_at IS NULL  -- Ensures soft-deleted quizzes never appear
AND (isTeacher OR published_at <= NOW())  -- Published check for students
```

### 3. **Backend API (Node.js/Express)**

#### GET `/quizzes` - List quizzes
```typescript
// Filters:
- Excludes deleted quizzes (deleted_at IS NULL)
- Filters unpublished for students (only if isTeacher OR published_at <= NOW)
- Lists only current course's quizzes
```

#### GET `/quizzes/:quizId` - Quiz detail
```typescript
// Security:
- Checks: deleted_at IS NULL
- Checks: published_at for non-teachers
- Returns 403 if student accesses unpublished quiz
```

#### POST `/quizzes` - Create quiz
```typescript
// Accepts:
- title, questions, scheduledAt, durationMinutes
- publishedAt (NEW) - Sets visibility timestamp
```

#### PUT `/quizzes/:quizId` - Update quiz
```typescript
// Validates:
- Quiz exists and deleted_at IS NULL
- Updates: title, questions, scheduledAt, durationMinutes, publishedAt
- Sends "Kvíz aktualizován" message to course feed
```

#### DELETE `/quizzes/:quizId` - Soft delete quiz
```typescript
// Changes from hard DELETE to:
UPDATE quizzes SET deleted_at = NOW() WHERE uuid = ?
// Sends "Kvíz smazán: [title]" system message to course feed
// Frontend ArchiveView excludes soft-deleted quizzes
```

#### POST `/quizzes/:quizId/submit` - Submit attempt
```typescript
// Validates:
- Quiz exists (deleted_at IS NULL)
- Returns 404 for deleted quizzes
```

#### POST `/quizzes/:quizId/control` - Control quiz (start/pause/resume)
```typescript
// Actions with system messages:
- start: "✅ Kvíz spuštěn: [title]"
- pause: "⏸️ Kvíz pozastaven: [title]"
- resume: "▶️ Kvíz pokračuje: [title]"
// All messages:
- Saved to feed_events table
- Broadcast to course feed (SSE)
- Visible only in correct course
```

### 4. **Frontend Vue 3 Components**

#### QuizModal.vue
```typescript
export interface Quiz {
  uuid?: string
  title: string
  questions: QuizQuestion[]
  publishedAt?: string | null  // NEW
  scheduledAt?: string | null  // When to auto-start
  durationMinutes?: number | null  // Time limit
  isPaused?: boolean
  startedAt?: string | null
}

// UI Fields (in order):
1. "Zveřejnit kvíz od" - publishedAt (required for visibility)
2. "Spustit kvíz v" - scheduledAt (optional auto-start)
3. "Doba trvání" - durationMinutes (optional time limit)
```

#### HeaderNav.vue (Course-Specific Notifications)
```vue
<!-- Bell icon conditionally rendered -->
<button
  v-if="user && currentCourseId"  <!-- Only on course pages -->
  @click="feedPopoverOpen = !feedPopoverOpen"
  class="p-2 text-[#0257A5]"
  title="Feed kurzu"
>
  🔔
</button>

<!-- Feed popover also conditional -->
<FeedPanel
  v-if="feedPopoverOpen && user && currentCourseId"
  :courseId="currentCourseId"
/>

<!-- Computed property: extract courseId from route -->
const currentCourseId = computed(() => {
  return (route.params.courseId as string) || ""
})
```

**Key Points:**
- Bell icon **only appears on course-specific pages** (CourseDetailView)
- Bell icon **hidden on global pages** (Courses, Dashboard, Home, Login)
- FeedPanel receives `courseId` prop, ensures course-specific messages
- Prevents feed leakage across courses

#### FeedPanel.vue (System Message Display)
```vue
<!-- System messages styled with blue badge -->
<span v-if="msg.type === 'system'" class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
  SYS
</span>

<!-- Message display includes feed content -->
<p class="text-sm text-gray-700">{{ msg.message }}</p>
```

**Message Examples:**
- "✅ Kvíz spuštěn: Quiz Title"
- "⏸️ Kvíz pozastaven: Quiz Title"
- "▶️ Kvíz pokračuje: Quiz Title"
- "Kvíz smazán: Quiz Title"
- "Kvíz aktualizován: Quiz Title"
- Teacher messages also displayed

#### ArchiveView.vue (Archived Quizzes)
```typescript
// Only displays archived quizzes
// Excludes:
- Active quizzes (is_paused = 0, duration not expired)
- Deleted quizzes (deleted_at IS NOT NULL)

// Server response filters deleted quizzes
// Frontend shows only status === "ARCHIVED"
```

## Security Improvements

### 1. **Soft Delete Protection**
- **Before**: Hard DELETE removed quiz data → could recover from backups only
- **After**: UPDATE with deleted_at preserves data → audit trail, undo capability
- **Benefit**: Deleted quizzes invisible to archive and normal queries

### 2. **Access Control**
- **Detail Endpoint**: Non-teachers can't access unpublished quizzes (403 Forbidden)
- **All Queries**: Include `deleted_at IS NULL` check
- **Feed Broadcasting**: Course-scoped, prevents cross-course leaks

### 3. **Data Integrity**
- All quiz endpoints now validate existence with `deleted_at IS NULL`
- Student submission endpoints check quiz isn't deleted
- Control actions (start/pause/resume) only work on non-deleted quizzes

## Database Impact

### Migration from Previous State
```sql
-- Add new columns
ALTER TABLE quizzes 
ADD COLUMN published_at DATETIME NULL AFTER title,
ADD COLUMN deleted_at DATETIME NULL AFTER scheduled_at;

-- No data loss: all existing quizzes remain active (deleted_at = NULL)
-- All existing quizzes are "published" (assuming published_at = NOW() for legacy quizzes)
```

## Feed System Architecture

### Feed_Events Table Structure
```typescript
{
  uuid: string
  course_id: number (foreign key)
  type: "system" | "user"
  content: string // Message text (includes emoji for system messages)
  author: string | null // null for system messages
  created_at: datetime
  updated_at: datetime
}
```

### Message Broadcasting
1. **Action Triggered** (start, pause, delete, etc.)
2. **Feed Event Created** in database
3. **System Message Generated** with emoji and context
4. **Course Feed Broadcast** via SSE (EventSource)
5. **Frontend Updates** displays message with SYS badge

## Testing Checklist

### Backend Endpoints
- [ ] GET /quizzes - Filters deleted, published_at checks
- [ ] GET /quizzes/:id - Returns 404 for deleted, 403 for unpublished
- [ ] POST /quizzes - Creates with publishedAt field
- [ ] PUT /quizzes/:id - Updates all fields, sends feed message
- [ ] DELETE /quizzes/:id - Soft deletes, sends deletion message
- [ ] POST /quizzes/:id/control - System messages appear in feed
- [ ] POST /quizzes/:id/submit - Rejects deleted quizzes

### Frontend Components
- [ ] QuizModal - publishedAt input displays and saves
- [ ] HeaderNav - Bell only appears on course pages
- [ ] FeedPanel - Shows system messages with SYS badge
- [ ] ArchiveView - Excludes deleted quizzes
- [ ] CourseDetailView - Feed messages update in real-time

### User Workflows
1. **Lecturer Creates Quiz**
   - Sets publishedAt to future date
   - Students cannot see until that date
   - Can update publishedAt anytime

2. **Lecturer Starts Quiz**
   - "✅ Kvíz spuštěn: [title]" appears in course feed
   - All course members notified via feed

3. **Lecturer Pauses Quiz**
   - "⏸️ Kvíz pozastaven: [title]" appears in course feed
   - Students can't submit answers

4. **Lecturer Deletes Quiz**
   - "Kvíz smazán: [title]" appears in course feed
   - Quiz removed from active lists
   - NOT visible in archive
   - Data preserved for audit/recovery

5. **Student Views Dashboard**
   - Only sees published quizzes
   - Bell icon not visible (global page)

6. **Student Views Course**
   - Only sees published quizzes
   - Bell icon visible (course page)
   - Feed shows instructor actions
   - Can submit to active, published quizzes

## Code Quality

### Error Handling
- All database operations wrapped in try/catch
- Feed operations don't block quiz updates (async error handling)
- Proper HTTP status codes (404 Not Found, 403 Forbidden, 400 Bad Request)

### Type Safety
- TypeScript interfaces for Quiz, QuizQuestion, FeedEvent
- Validation of action parameters in control endpoint
- Null-coalescing for optional fields

### Performance
- Feed polling every 2s (configurable)
- EventSource for efficient real-time updates
- Indexed queries by uuid, course_id, deleted_at

## Files Modified

1. [apps/server/src/db/init.ts](apps/server/src/db/init.ts#L1) - Database schema
2. [apps/server/src/routes/quizzes.ts](apps/server/src/routes/quizzes.ts#L1) - All API endpoints
3. [apps/web/src/components/QuizModal.vue](apps/web/src/components/QuizModal.vue#L1) - Quiz form
4. [apps/web/src/components/HeaderNav.vue](apps/web/src/components/HeaderNav.vue#L1) - Navigation bar
5. [apps/web/src/components/FeedPanel.vue](apps/web/src/components/FeedPanel.vue#L1) - Feed display
6. [apps/web/src/views/ArchiveView.vue](apps/web/src/views/ArchiveView.vue#L1) - Archive list

## Rollback Plan

If issues discovered:
1. **Schema Rollback**: `ALTER TABLE quizzes DROP COLUMN published_at, DROP COLUMN deleted_at;`
2. **Code Rollback**: Revert commits, clear browser cache
3. **Data Recovery**: All quiz data preserved in soft-deleted rows if accidentally deleted

## Future Enhancements

1. **Quiz Templates**: Reuse question sets across courses
2. **Bulk Operations**: Start/pause multiple quizzes at once
3. **Scheduling Rules**: Recurring quizzes (weekly, monthly)
4. **Feed Filtering**: Show only certain event types in feed
5. **Archive Restore**: Un-delete quizzes from soft-delete
6. **Audit Logs**: Track all quiz modifications with timestamps/users
