import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, Plus, RefreshCw, Table2, Upload } from "lucide-react";
import type { Course, CourseStatus, Instructor, ProductType, RateType } from "./types";
import { PRODUCT_TYPES, RATE_TYPES } from "./types";
import { ConfirmDialog } from "./components/Modal";
import { CourseFormModal } from "./components/CourseFormModal";
import { ImportModal } from "./components/ImportModal";
import { Kpis } from "./components/Kpis";
import { OfferModal } from "./components/OfferModal";
import { PipelineBoard } from "./components/PipelineBoard";
import { QuickViewModal } from "./components/QuickViewModal";
import { RosterTable } from "./components/RosterTable";
import { useToast } from "./components/Toast";
import { mergeCourses } from "./lib/csv";
import { formatLongDate, todayISO } from "./lib/format";
import { refreshRemote } from "./lib/provider";
import { filterCourses } from "./lib/schedule";
import { createSeed } from "./lib/seed";
import { loadDashboard, saveDashboard } from "./lib/storage";

type View = "roster" | "pipeline";

interface OfferRequest {
  ids: string[];
  instructor?: Instructor;
}

export function App() {
  const toast = useToast();
  const loaded = useMemo(() => loadDashboard(), []);
  const [courses, setCourses] = useState<Course[]>(loaded.courses);
  const [instructors, setInstructors] = useState<Instructor[]>(loaded.instructors);
  const [view, setView] = useState<View>("roster");
  const [hideEnded, setHideEnded] = useState(true);
  const [search, setSearch] = useState("");
  const [rateType, setRateType] = useState<RateType | "">("");
  const [subject, setSubject] = useState("");
  const [productType, setProductType] = useState<ProductType | "">("");
  const [needsTutorOnly, setNeedsTutorOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [offer, setOffer] = useState<OfferRequest | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const today = todayISO();

  useEffect(() => {
    if (loaded.warning) toast(loaded.warning, "warning");
  }, [loaded.warning, toast]);

  useEffect(() => {
    saveDashboard({ courses, instructors });
  }, [courses, instructors]);

  const filtered = useMemo(
    () => filterCourses(courses, { search, rateType, subject, productType, needsTutorOnly, hideEnded, today }),
    [courses, search, rateType, subject, productType, needsTutorOnly, hideEnded, today],
  );
  const subjects = useMemo(() => [...new Set(courses.map((course) => course.subject))].sort((a, b) => a.localeCompare(b)), [courses]);
  const filtersNarrow = filtered.visible.length !== courses.length;
  const editing = editingId && editingId !== "new" ? (courses.find((course) => course.id === editingId) ?? null) : null;
  const viewing = viewingId ? (courses.find((course) => course.id === viewingId) ?? null) : null;
  const deleting = deletingId ? (courses.find((course) => course.id === deletingId) ?? null) : null;

  const resetFilters = useCallback(() => {
    setSearch("");
    setRateType("");
    setSubject("");
    setProductType("");
    setNeedsTutorOnly(false);
    setHideEnded(true);
  }, []);

  const openOffer = useCallback((ids: string[], instructor?: Instructor) => {
    setOffer({ ids, instructor });
  }, []);

  const commitOffer = useCallback((ids: string[], tutor: { name: string; email: string }, status: "Waiting for response" | "Assigned") => {
    setCourses((current) =>
      current.map((course) =>
        ids.includes(course.id)
          ? { ...course, instructorName: tutor.name, instructorEmail: tutor.email, status }
          : course,
      ),
    );
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setOffer(null);
  }, []);

  const saveCourse = useCallback(
    (course: Course) => {
      setCourses((current) => {
        const exists = current.some((item) => item.id === course.id);
        return exists ? current.map((item) => (item.id === course.id ? course : item)) : [course, ...current];
      });
      setEditingId(null);
      toast(editingId === "new" ? "Course added." : "Course saved.");
    },
    [editingId, toast],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await refreshRemote({ courses, instructors });
      if (result.ok) {
        setCourses(result.courses);
        setInstructors(result.instructors);
        toast(result.message);
      } else toast(result.message, "warning");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Refresh failed.", "error");
    } finally {
      setRefreshing(false);
    }
  }, [courses, instructors, toast]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-indigo-700 uppercase">Varsity Tutors Group Courses</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">Course Assignment & Scheduling Operations Dashboard</h1>
            <p className="text-xs text-slate-500">Operator Sofia Nunez · Today is {formatLongDate(today)} CT · Edits stay in this browser</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium" onClick={() => setResetOpen(true)} data-testid="reset-sample">
              Reset to sample data
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium disabled:opacity-50" onClick={() => void refresh()} disabled={refreshing} data-testid="refresh-sources">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium" onClick={() => setImportOpen(true)} data-testid="open-import">
              <Upload size={14} /> Import CSV
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md bg-indigo-700 px-2.5 py-1.5 text-sm font-semibold text-white" onClick={() => setEditingId("new")} data-testid="add-course">
              <Plus size={14} /> Add course
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 pb-24">
        <Kpis courses={courses} filtered={filtered.visible} narrowed={filtersNarrow} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="tablist" aria-label="Dashboard view">
            <TabButton active={view === "roster"} onClick={() => setView("roster")} testId="view-roster">
              <Table2 size={14} /> Roster
            </TabButton>
            <TabButton active={view === "pipeline"} onClick={() => setView("pipeline")} testId="view-pipeline">
              <LayoutGrid size={14} /> Pipeline
            </TabButton>
          </div>
          <p className="text-xs text-slate-500">Filters apply to the roster, the pipeline, and the KPIs.</p>
        </div>

        <section className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
          <label className="min-w-56 flex-1 text-xs font-semibold text-slate-600">
            Search
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal"
              placeholder="Course, subject, tutor, or ID"
              value={search}
              data-testid="search-input"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <FilterSelect label="Rate type" value={rateType} testId="rate-filter" onChange={(value) => setRateType(value as RateType | "")}>
            <option value="">All rate types</option>
            {RATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Subject" value={subject} testId="subject-filter" onChange={setSubject}>
            <option value="">All subjects</option>
            {subjects.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Product type" value={productType} testId="product-filter" onChange={(value) => setProductType(value as ProductType | "")}>
            <option value="">Livestream and Small Group</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </FilterSelect>
          <label className="flex items-center gap-2 pb-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={needsTutorOnly} data-testid="needs-tutor-toggle" onChange={(event) => setNeedsTutorOnly(event.target.checked)} />
            Needs Tutor Only
          </label>
          <label className="flex items-center gap-2 pb-1.5 text-sm text-slate-700" title="Hides status Ended, and any course whose end date is before today in America/Chicago.">
            <input type="checkbox" checked={hideEnded} data-testid="hide-ended-toggle" onChange={(event) => setHideEnded(event.target.checked)} />
            Hide Ended Courses ({filtered.endedCount})
          </label>
          <button type="button" className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium" data-testid="reset-filters" onClick={resetFilters}>
            Reset Filters
          </button>
        </section>

        {view === "roster" ? (
          <RosterTable
            courses={filtered.visible}
            instructors={instructors}
            roster={courses}
            selected={selected}
            onToggle={(id, checked) => setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))}
            onToggleAll={(checked) => setSelected(checked ? filtered.visible.map((course) => course.id) : [])}
            onBookmark={(id) => setCourses((current) => current.map((course) => (course.id === id ? { ...course, workingOnIt: !course.workingOnIt } : course)))}
            onStatus={(id, status) => setCourses((current) => current.map((course) => (course.id === id ? { ...course, status } : course)))}
            onOffer={openOffer}
            onView={setViewingId}
            onEdit={setEditingId}
            onDelete={setDeletingId}
            emptyBecauseFilters={courses.length > 0}
            onResetFilters={resetFilters}
          />
        ) : (
          <PipelineBoard
            courses={filtered.visible}
            onOffer={(id) => openOffer([id])}
            onConfirm={(id) => {
              const course = courses.find((item) => item.id === id);
              if (!course?.instructorName || !course.instructorEmail) {
                toast("Choose a tutor before confirming this course.", "error");
                openOffer([id]);
                return;
              }
              setCourses((current) => current.map((item) => (item.id === id ? { ...item, status: "Assigned" satisfies CourseStatus } : item)));
              toast(`Assigned ${course.name} to ${course.instructorName}.`);
            }}
            onReopen={(id) => {
              setCourses((current) =>
                current.map((course) =>
                  course.id === id ? { ...course, status: "Available", instructorName: null, instructorEmail: null } : course,
                ),
              );
              toast("Course reopened as Available. The instructor was cleared.");
            }}
          />
        )}
      </main>

      {view === "roster" && selected.length > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-white shadow-xl" data-testid="selection-bar">
          <span className="font-semibold tabular-nums">{selected.length} selected</span>
          <button type="button" className="rounded-full bg-indigo-500 px-3 py-1 font-semibold" data-testid="offer-multiple" onClick={() => openOffer(selected)}>
            Offer Multiple to Tutor
          </button>
          <button type="button" className="text-slate-300" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <OfferModal
        open={Boolean(offer)}
        courseIds={offer?.ids ?? []}
        instructor={offer?.instructor}
        courses={courses}
        instructors={instructors}
        onClose={() => setOffer(null)}
        onCommit={commitOffer}
      />
      <CourseFormModal open={editingId !== null} course={editingId === "new" ? null : editing} onClose={() => setEditingId(null)} onSave={saveCourse} />
      <QuickViewModal
        course={viewing}
        onClose={() => setViewingId(null)}
        onEdit={(id) => {
          setViewingId(null);
          setEditingId(id);
        }}
        onOffer={(id) => {
          setViewingId(null);
          openOffer([id]);
        }}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(incoming) => {
          const merged = mergeCourses(courses, incoming);
          setCourses(merged.courses);
          setImportOpen(false);
          if (merged.added.length === 0) toast("Those courses are already on the roster. Nothing new was added.", "warning");
          else toast(`Imported ${merged.added.length} course${merged.added.length === 1 ? "" : "s"}.`);
        }}
      />
      {resetOpen ? (
        <ConfirmDialog
          title="Reset to sample data"
          body="This replaces the roster and instructor directory saved in this browser with the sample courses."
          confirmLabel="Reset sample data"
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            const sample = createSeed();
            setCourses(sample.courses);
            setInstructors(sample.instructors);
            setSelected([]);
            resetFilters();
            setResetOpen(false);
            toast("Sample roster restored.");
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete course"
          body={`Delete ${deleting.name}? This cannot be undone.`}
          confirmLabel="Delete course"
          onClose={() => setDeletingId(null)}
          onConfirm={() => {
            setCourses((current) => current.filter((course) => course.id !== deleting.id));
            setSelected((current) => current.filter((id) => id !== deleting.id));
            setDeletingId(null);
            toast("Course deleted.");
          }}
        />
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: ReactNode; testId: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold ${active ? "bg-indigo-700 text-white" : "text-slate-600"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  testId: string;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal" value={value} data-testid={testId} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
