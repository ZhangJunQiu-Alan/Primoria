import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CopyIcon, Pencil1Icon, PlusIcon, TrashIcon, UploadIcon } from '@radix-ui/react-icons';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { useCourseList, useCreateCourse, useDeleteCourse, useDuplicateCourse, useImportCourse } from '@/queries/courses';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: courses = [], isLoading } = useCourseList(user?.id);
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const duplicateCourse = useDuplicateCourse();
  const importCourse = useImportCourse();

  async function handleCreate() {
    if (!user || !newTitle.trim()) return;
    const course = await createCourse.mutateAsync({ title: newTitle.trim(), userId: user.id });
    setNewTitle('');
    setCreating(false);
    navigate(`/editor/${course.id}`);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm('Delete this course? This action cannot be undone.')) return;
    await deleteCourse.mutateAsync({ id, userId: user.id });
  }

  async function handleDuplicate(id: string) {
    if (!user) return;
    const result = await duplicateCourse.mutateAsync({ id, userId: user.id });
    navigate(`/editor/${result.course.id}`);
  }

  async function handleImport(file: File) {
    if (!user) return;
    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);
      const result = await importCourse.mutateAsync({ raw, userId: user.id });
      navigate(`/editor/${result.course.id}`);
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-primary">Primoria Builder</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">My Courses</h1>
          <div className="flex items-center gap-2">
            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importCourse.isPending}
              title="Import course from JSON file"
              className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              <UploadIcon />
              {importCourse.isPending ? 'Importing…' : 'Import'}
            </button>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <PlusIcon /> New Course
            </button>
          </div>
        </div>

        {/* New course dialog */}
        {creating && (
          <div className="mb-6 flex gap-3 items-center rounded-lg border bg-card p-4">
            <input
              autoFocus
              type="text"
              placeholder="Course title…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
            />
            <button
              onClick={() => void handleCreate()}
              disabled={!newTitle.trim() || createCourse.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createCourse.isPending ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Course list */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-20">Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">No courses yet</p>
            <button
              onClick={() => setCreating(true)}
              className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create your first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group rounded-lg border bg-card p-5 flex flex-col gap-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex-1">
                  <h2 className="font-semibold line-clamp-2">{course.title}</h2>
                  {course.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-medium rounded-full px-2 py-0.5',
                      course.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {course.status}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/editor/${course.id}`)}
                      className="rounded p-1.5 hover:bg-accent transition-colors"
                      title="Edit"
                    >
                      <Pencil1Icon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDuplicate(course.id)}
                      disabled={duplicateCourse.isPending}
                      className="rounded p-1.5 hover:bg-accent disabled:opacity-50 transition-colors"
                      title="Duplicate"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void handleDelete(course.id)}
                      className="rounded p-1.5 hover:bg-destructive/10 text-destructive transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
