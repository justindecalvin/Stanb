import React, { useState, useMemo, useRef } from 'react';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  Download, 
  Upload, 
  FileArchive, 
  Search, 
  Filter, 
  Plus, 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Users, 
  BookOpen, 
  Sparkles, 
  Printer, 
  Trash2, 
  Edit3, 
  Eye, 
  Radio, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  X, 
  Camera, 
  FileText 
} from 'lucide-react';
import { WaecRegistration, WaecDepartment, StudentProfile } from '../../../types';
import { useSchool } from '../../../context/SchoolContext';
import { 
  downloadWaecPackageZip, 
  downloadSingleStudentWaecZip, 
  importWaecPackageZip 
} from '../../../utils/waecZipManager';
import { NIGERIAN_STATES } from '../../../data/nigeriaStatesLga';
import { WAEC_COMPULSORY_SUBJECTS, WAEC_ELECTIVE_SUBJECTS, WAEC_DEPARTMENT_RECOMMENDATIONS } from '../../../data/waecSubjects';

export const AdminWaecRegistrationTab: React.FC = () => {
  const { 
    schoolInfo, 
    students, 
    waecRegistrations, 
    saveWaecRegistration, 
    updateWaecRegistrationStatus, 
    deleteWaecRegistration, 
    waecPromptBroadcast, 
    broadcastWaecPrompt, 
    importWaecRegistrationsBatch 
  } = useSchool();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | WaecDepartment>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'verified' | 'queried' | 'draft'>('all');

  // Selected registration for modal review
  const [selectedCandidate, setSelectedCandidate] = useState<WaecRegistration | null>(null);
  const [editingCandidateNumber, setEditingCandidateNumber] = useState('');
  const [editingAdminRemarks, setEditingAdminRemarks] = useState('');

  // Prompt configuration modal / panel
  const [showPromptConfig, setShowPromptConfig] = useState(false);
  const [promptTitle, setPromptTitle] = useState(waecPromptBroadcast?.title || 'Mandatory WAEC Bio-Data & 9-Subject Registration');
  const [promptMessage, setPromptMessage] = useState(waecPromptBroadcast?.message || '');
  const [promptDeadline, setPromptDeadline] = useState(waecPromptBroadcast?.deadline || '2026-11-30');
  const [promptIsActive, setPromptIsActive] = useState(waecPromptBroadcast?.isActive ?? true);
  const [promptTargetClasses, setPromptTargetClasses] = useState<string[]>(
    waecPromptBroadcast?.targetClasses || ['SSS 2 Science', 'SSS 2 Arts & Commercial', 'SSS 3 Science', 'SSS 2', 'SSS 3']
  );

  // Manual Enrol candidate modal
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [selectedStudentForEnrol, setSelectedStudentForEnrol] = useState<string>('');

  // ZIP Operations State
  const [isDownloadingAllZip, setIsDownloadingAllZip] = useState(false);
  const [isImportingZip, setIsImportingZip] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to show notices
  const notify = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 6000);
  };

  // SS 2 & SS 3 eligible student list
  const seniorSecondaryStudents = useMemo(() => {
    return students.filter(s => {
      const g = (s.grade || '').toLowerCase();
      return g.includes('ss 2') || g.includes('ss 3') || g.includes('sss 2') || g.includes('sss 3');
    });
  }, [students]);

  // Unique classes represented in registrations or senior secondary
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    waecRegistrations.forEach(r => { if (r.targetClass) set.add(r.targetClass); });
    seniorSecondaryStudents.forEach(s => { if (s.grade) set.add(s.grade); });
    return Array.from(set);
  }, [waecRegistrations, seniorSecondaryStudents]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = waecRegistrations.length;
    const verified = waecRegistrations.filter(r => r.status === 'verified').length;
    const submitted = waecRegistrations.filter(r => r.status === 'submitted').length;
    const queried = waecRegistrations.filter(r => r.status === 'queried').length;
    const drafts = waecRegistrations.filter(r => r.status === 'draft').length;
    
    const science = waecRegistrations.filter(r => r.department === 'Science').length;
    const arts = waecRegistrations.filter(r => r.department === 'Arts').length;
    const commercial = waecRegistrations.filter(r => r.department === 'Commercial').length;

    const ss2Count = waecRegistrations.filter(r => (r.targetClass || '').toLowerCase().includes('2')).length;
    const ss3Count = waecRegistrations.filter(r => (r.targetClass || '').toLowerCase().includes('3')).length;

    return { total, verified, submitted, queried, drafts, science, arts, commercial, ss2Count, ss3Count };
  }, [waecRegistrations]);

  // Filtered registrations list
  const filteredRegistrations = useMemo(() => {
    return waecRegistrations.filter(r => {
      const matchSearch = !searchQuery || 
        r.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.candidateNumber && r.candidateNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.nin && r.nin.includes(searchQuery));

      const matchClass = classFilter === 'all' || r.targetClass === classFilter;
      const matchDept = departmentFilter === 'all' || r.department === departmentFilter;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;

      return matchSearch && matchClass && matchDept && matchStatus;
    });
  }, [waecRegistrations, searchQuery, classFilter, departmentFilter, statusFilter]);

  // Trigger download of ALL candidate data & images as ZIP archive
  const handleDownloadCompleteZip = async () => {
    if (waecRegistrations.length === 0) {
      notify('No candidate registrations available to download.', 'error');
      return;
    }

    setIsDownloadingAllZip(true);
    try {
      const res = await downloadWaecPackageZip(waecRegistrations, {
        schoolName: schoolInfo.name,
        session: schoolInfo.activeSession
      });
      if (res.success) {
        notify(`Official WAEC package created! Exported ${res.count} candidates & photo assets to ${res.filename}.`);
      }
    } catch (err) {
      console.error('Error generating complete ZIP:', err);
      notify('Failed to generate ZIP archive. Please verify browser memory permissions.', 'error');
    } finally {
      setIsDownloadingAllZip(false);
    }
  };

  // Trigger import of candidate data & images from uploaded ZIP file
  const handleImportZipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingZip(true);
    try {
      const res = await importWaecPackageZip(file);
      if (res.success && res.registrations.length > 0) {
        const count = importWaecRegistrationsBatch(res.registrations);
        notify(`Successfully imported ${count} candidate registration(s) and extracted ${res.extractedPhotosCount} passport image(s) from ZIP archive!`);
      } else {
        notify(res.message || 'Could not find candidate data inside the ZIP file.', 'error');
      }
    } catch (err) {
      console.error('Failed to parse uploaded ZIP:', err);
      notify('Could not process ZIP archive. Ensure file was created by WAEC package manager.', 'error');
    } finally {
      setIsImportingZip(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  // Broadcast prompt update
  const handleSaveBroadcastPrompt = () => {
    broadcastWaecPrompt({
      title: promptTitle.trim(),
      message: promptMessage.trim(),
      deadline: promptDeadline,
      isActive: promptIsActive,
      targetClasses: promptTargetClasses,
      sentAt: new Date().toISOString(),
      sentBy: 'Registrar / Academic Office'
    });
    setShowPromptConfig(false);
    notify('SS 2 & SS 3 WAEC Bio-Data prompt updated and broadcasted to candidate portals!');
  };

  // Review modal actions
  const handleOpenReview = (cand: WaecRegistration) => {
    setSelectedCandidate(cand);
    setEditingCandidateNumber(cand.candidateNumber || '');
    setEditingAdminRemarks(cand.adminRemarks || '');
  };

  const handleUpdateStatusAndRemarks = (newStatus: WaecRegistration['status']) => {
    if (!selectedCandidate) return;

    saveWaecRegistration({
      ...selectedCandidate,
      candidateNumber: editingCandidateNumber.trim() || undefined,
      adminRemarks: editingAdminRemarks.trim() || undefined,
      status: newStatus,
      verifiedAt: newStatus === 'verified' ? new Date().toISOString() : selectedCandidate.verifiedAt,
      verifiedBy: newStatus === 'verified' ? 'Admin Examination Officer' : selectedCandidate.verifiedBy
    });

    notify(`Candidate ${selectedCandidate.surname} ${selectedCandidate.firstName} status updated to: ${newStatus.toUpperCase()}`);
    setSelectedCandidate(null);
  };

  // Manual candidate addition
  const handleEnrolSelectedStudent = () => {
    if (!selectedStudentForEnrol) return;
    const found = students.find(s => s.id === selectedStudentForEnrol);
    if (!found) return;

    // Check if already registered
    const existing = waecRegistrations.find(r => r.studentId === found.id);
    if (existing) {
      notify(`Scholar ${found.name} is already registered in the WAEC portal.`, 'info');
      handleOpenReview(existing);
      setShowAddCandidateModal(false);
      return;
    }

    const nameParts = (found.name || '').trim().split(/\s+/);
    const sur = nameParts[0] || 'STUDENT';
    const first = nameParts[1] || '';
    const mid = nameParts.slice(2).join(' ') || undefined;

    const dept: WaecDepartment = (found.grade || '').toLowerCase().includes('science') 
      ? 'Science' 
      : (found.grade || '').toLowerCase().includes('art') 
      ? 'Arts' 
      : 'Commercial';

    const defaultSubs = [
      'English Language',
      'Mathematics',
      'Civic Education',
      ...(WAEC_DEPARTMENT_RECOMMENDATIONS[dept] || [])
    ].slice(0, 9);

    const created = saveWaecRegistration({
      studentId: found.id,
      regNumber: found.regNumber,
      surname: sur.toUpperCase(),
      firstName: first,
      middleName: mid,
      dateOfBirth: '2008-01-01',
      gender: found.gender === 'Female' ? 'Female' : 'Male',
      stateOfOrigin: 'Lagos',
      lga: 'Ikeja',
      religion: 'Christianity',
      phone: found.parentPhone || '+234 800 000 0000',
      nin: '',
      homeAddress: found.address || 'Lagos, Nigeria',
      email: `${found.regNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@stanbaxschools.edu.ng`,
      department: dept,
      examType: 'WASSCE (May/June)',
      targetClass: found.grade || 'SSS 2',
      passportPhoto: found.passportPhoto,
      passportFilename: `${found.regNumber}_passport.jpg`,
      subjects: defaultSubs,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });

    setShowAddCandidateModal(false);
    notify(`Candidate ${created.surname} ${created.firstName} successfully enrolled into WAEC registry!`);
    handleOpenReview(created);
  };

  return (
    <div className="space-y-6 p-4 sm:p-8">
      {/* Top Banner Header */}
      <div className="bg-linear-to-r from-emerald-950 via-stone-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-stone-900">
              WAEC Centre Desk No: 421098
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
              Senior Secondary (SS 2 & SS 3)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            WAEC / WASSCE Registration & Bio-Data Directorate
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Manage candidates, verify National Identity Numbers (NIN), check compulsory 9 subjects, deploy automated student portal prompts, and export complete broadsheets and student passport archives in ZIP files.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap lg:flex-col gap-2 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCompleteZip}
            disabled={isDownloadingAllZip}
            className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-md transition flex items-center justify-center gap-2"
            title="Download full candidate broadsheet CSV, JSON, and passport pictures in a single ZIP file"
          >
            {isDownloadingAllZip ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileArchive className="w-4 h-4" />
            )}
            <span>Download All Data & Photos (ZIP)</span>
          </button>

          <button
            type="button"
            onClick={() => zipInputRef.current?.click()}
            disabled={isImportingZip}
            className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition flex items-center justify-center gap-2"
            title="Upload a ZIP archive containing candidate broadsheet and student photos"
          >
            {isImportingZip ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Upload Candidate ZIP File</span>
          </button>

          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleImportZipFile}
            className="hidden"
          />

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowPromptConfig(true)}
              className="flex-1 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Configure Student Prompt</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCandidateModal(true)}
              className="flex-1 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-white/10 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enrol Candidate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold shadow-md animate-in fade-in ${
          actionNotice.type === 'error'
            ? 'bg-rose-50 border border-rose-300 text-rose-900'
            : actionNotice.type === 'info'
            ? 'bg-blue-50 border border-blue-300 text-blue-900'
            : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
        }`}>
          {actionNotice.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          ) : actionNotice.type === 'info' ? (
            <Sparkles className="w-5 h-5 shrink-0 text-blue-600" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
            Total Candidates
          </span>
          <div className="text-2xl font-black text-stone-900 mt-1">{stats.total}</div>
          <span className="text-[10px] font-bold text-stone-400">SS 2: {stats.ss2Count} &bull; SS 3: {stats.ss3Count}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
            Verified / Approved
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.verified}</div>
          <span className="text-[10px] font-bold text-emerald-600">Ready for WAEC</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
            Awaiting Review
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1">{stats.submitted}</div>
          <span className="text-[10px] font-bold text-blue-500">Submitted by Scholars</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">
            Queried Records
          </span>
          <div className="text-2xl font-black text-rose-700 mt-1">{stats.queried}</div>
          <span className="text-[10px] font-bold text-rose-500">Requires Correction</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
            Sciences
          </span>
          <div className="text-2xl font-black text-stone-900 mt-1">{stats.science}</div>
          <span className="text-[10px] font-bold text-stone-400">Pure & Applied</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
            Arts & Commercial
          </span>
          <div className="text-2xl font-black text-stone-900 mt-1">{stats.arts + stats.commercial}</div>
          <span className="text-[10px] font-bold text-stone-400">Arts: {stats.arts} &bull; Comm: {stats.commercial}</span>
        </div>
      </div>

      {/* Prompt Status Pill Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5 text-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-stone-900">
                Automatic Student Portal Prompt:
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                waecPromptBroadcast?.isActive ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
              }`}>
                {waecPromptBroadcast?.isActive ? 'Active & Prompting SS 2 / SS 3' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              "{waecPromptBroadcast?.title}" &bull; Deadline: {waecPromptBroadcast?.deadline || 'None'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPromptConfig(true)}
          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
        >
          Edit / Send Broadcast
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Reg No, NIN, Candidate Index..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 font-bold text-stone-700 bg-white"
            >
              <option value="all">All Classes</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 font-bold text-stone-700 bg-white"
            >
              <option value="all">All Departments</option>
              <option value="Science">Sciences</option>
              <option value="Arts">Arts</option>
              <option value="Commercial">Commercial</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-200 font-bold text-stone-700 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="queried">Queried</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Candidate / Bio-Data</th>
                <th className="py-3 px-4">WAEC Index No</th>
                <th className="py-3 px-4">Class & Dept</th>
                <th className="py-3 px-4">NIN & Contact</th>
                <th className="py-3 px-4">Origin & LGA</th>
                <th className="py-3 px-4">9 Subjects</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold">No candidates found matching the active filters.</p>
                    <p className="text-[11px] mt-1">Use the "Enrol Candidate" button or click "Download/Upload ZIP" to sync registrations.</p>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((cand) => (
                  <tr key={cand.id} className="hover:bg-stone-50/80 transition">
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 shadow-2xs">
                          {cand.passportPhoto ? (
                            <img
                              src={cand.passportPhoto}
                              alt={cand.surname}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300 font-black text-xs">
                              {cand.surname.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-black text-stone-900 text-sm">
                            {cand.surname} {cand.firstName}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500">
                            {cand.regNumber} &bull; {cand.gender}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* WAEC Index */}
                    <td className="py-3.5 px-4">
                      {cand.candidateNumber ? (
                        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                          {cand.candidateNumber}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Class & Dept */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{cand.targetClass}</div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        cand.department === 'Science'
                          ? 'bg-blue-100 text-blue-800'
                          : cand.department === 'Arts'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cand.department}
                      </span>
                    </td>

                    {/* NIN & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-stone-900">
                        {cand.nin ? `NIN: ${cand.nin}` : <span className="text-rose-500">No NIN</span>}
                      </div>
                      <div className="text-[11px] text-stone-500">{cand.phone}</div>
                    </td>

                    {/* Origin */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{cand.stateOfOrigin} State</div>
                      <div className="text-[11px] text-stone-500">{cand.lga} LGA</div>
                    </td>

                    {/* 9 Subjects */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          cand.subjects.length === 9
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {cand.subjects.length} Subjects
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5 truncate max-w-[160px]" title={cand.subjects.join(', ')}>
                        {cand.subjects.slice(0, 3).join(', ')}...
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        cand.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : cand.status === 'submitted'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : cand.status === 'queried'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-stone-200 text-stone-700'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {cand.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(cand)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                          title="Review Candidate & Assign Index Number"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSingleStudentWaecZip(cand, `${cand.surname}_${cand.firstName}`)}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition"
                          title="Download Student ZIP Package"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete WAEC registration for ${cand.surname} ${cand.firstName}?`)) {
                              deleteWaecRegistration(cand.id);
                              notify('Registration deleted.');
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-100 text-stone-400 hover:text-rose-600 transition"
                          title="Delete Registration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Review Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-black">
                  <Award className="w-6 h-6 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">
                    Review WAEC Candidate: {selectedCandidate.surname} {selectedCandidate.firstName}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Registration No: {selectedCandidate.regNumber} &bull; {selectedCandidate.targetClass}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Photo & Main Specs */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="w-24 h-28 rounded-xl bg-stone-200 overflow-hidden shrink-0 border border-stone-300 shadow-xs">
                  {selectedCandidate.passportPhoto ? (
                    <img
                      src={selectedCandidate.passportPhoto}
                      alt="Candidate"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400">Date of Birth:</span>
                      <p className="font-bold text-stone-800">{selectedCandidate.dateOfBirth} ({selectedCandidate.gender})</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400">Origin:</span>
                      <p className="font-bold text-stone-800">{selectedCandidate.stateOfOrigin} &bull; {selectedCandidate.lga}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400">National NIN:</span>
                      <p className="font-mono font-bold text-stone-800">{selectedCandidate.nin || 'Pending'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400">Phone & Email:</span>
                      <p className="font-bold text-stone-800 truncate">{selectedCandidate.phone}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400">Home Address:</span>
                    <p className="font-medium text-stone-700">{selectedCandidate.homeAddress}</p>
                  </div>
                </div>
              </div>

              {/* 9 Subjects List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px]">
                    Registered 9 Examination Subjects:
                  </h4>
                  <span className="text-emerald-700 font-bold">{selectedCandidate.subjects.length} Subjects Total</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedCandidate.subjects.map((sub, i) => (
                    <div key={sub} className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-bold text-stone-800 truncate">{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assign Index Number */}
              <div className="space-y-1.5 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <label className="block font-black text-emerald-950 uppercase tracking-wider text-[11px]">
                  Official WAEC Candidate / Index Number:
                </label>
                <input
                  type="text"
                  value={editingCandidateNumber}
                  onChange={(e) => setEditingCandidateNumber(e.target.value)}
                  placeholder="e.g. 4251001042"
                  className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 font-mono font-bold text-stone-900 bg-white"
                />
                <span className="text-[10px] text-emerald-800">
                  Unique 10-digit candidate index allocated by WAEC / Examination Authority.
                </span>
              </div>

              {/* Admin Remarks / Queries */}
              <div className="space-y-1.5">
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px]">
                  Administrative Remarks / Query Instructions:
                </label>
                <textarea
                  rows={2}
                  value={editingAdminRemarks}
                  onChange={(e) => setEditingAdminRemarks(e.target.value)}
                  placeholder="e.g. Verified and approved. Or: Please upload a clearer passport photo with white backdrop."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-medium text-stone-900"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-stone-50 p-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatusAndRemarks('queried')}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition"
                >
                  Flag as Queried
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatusAndRemarks('submitted')}
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition"
                >
                  Reset to Submitted
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadSingleStudentWaecZip(selectedCandidate, `${selectedCandidate.surname}_${selectedCandidate.firstName}`)}
                  className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatusAndRemarks('verified')}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Approve Candidate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Prompt Configuration Modal */}
      {showPromptConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="bg-emerald-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black">
                  <Radio className="w-6 h-6 text-emerald-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Configure WAEC Student Portal Prompt</h3>
                  <p className="text-xs text-emerald-200">Broadcasts automatic alert to SS 2 & SS 3 scholar logins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptConfig(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Prompt Banner Title
                </label>
                <input
                  type="text"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Notification Message & Instructions
                </label>
                <textarea
                  rows={4}
                  value={promptMessage}
                  onChange={(e) => setPromptMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-medium text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="date"
                    value={promptDeadline}
                    onChange={(e) => setPromptDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                    Prompt Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setPromptIsActive(!promptIsActive)}
                    className={`w-full py-2.5 rounded-xl font-bold border transition text-center ${
                      promptIsActive
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {promptIsActive ? 'Active (Displaying in Portals)' : 'Paused'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Target Classes
                </label>
                <div className="flex flex-wrap gap-2">
                  {['SSS 2 Science', 'SSS 2 Arts & Commercial', 'SSS 3 Science', 'SSS 2', 'SSS 3'].map((cls) => {
                    const isChecked = promptTargetClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setPromptTargetClasses(prev => prev.filter(c => c !== cls));
                          } else {
                            setPromptTargetClasses(prev => [...prev, cls]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                          isChecked
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {isChecked && '✓ '}{cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-stone-50 p-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPromptConfig(false)}
                className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBroadcastPrompt}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md transition"
              >
                Save & Broadcast Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Enrol Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="bg-stone-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-900 flex items-center justify-center font-black">
                  <Plus className="w-6 h-6 text-stone-950" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Enrol Scholar into WAEC Registry</h3>
                  <p className="text-xs text-stone-400">Select an existing SS 2 or SS 3 student</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCandidateModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-black text-stone-700 uppercase tracking-wider text-[11px] mb-1">
                  Select Scholar from Senior Secondary
                </label>
                <select
                  value={selectedStudentForEnrol}
                  onChange={(e) => setSelectedStudentForEnrol(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-900 bg-white"
                >
                  <option value="">-- Choose Senior Secondary Scholar --</option>
                  {seniorSecondaryStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.regNumber}) — {s.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
                <p className="font-bold">Automated Bio-Data Pre-population:</p>
                <p className="text-[11px]">
                  Enrolling the scholar will automatically inherit their full names, class grade, passport photo, parent contacts, and set up the 3 compulsory core subjects (English, Maths, Civic Education).
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddCandidateModal(false)}
                className="px-4 py-2 rounded-xl text-stone-600 font-bold text-xs hover:bg-stone-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnrolSelectedStudent}
                disabled={!selectedStudentForEnrol}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-black text-xs shadow-md transition"
              >
                Enrol into WAEC Desk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
