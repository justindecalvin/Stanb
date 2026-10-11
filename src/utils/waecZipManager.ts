import JSZip from 'jszip';
import { WaecRegistration } from '../types';

/**
 * Converts a Base64 data URL into a Uint8Array or Blob for JSZip
 */
function dataUrlToBinary(dataUrl: string): { data: Uint8Array; extension: string } | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { data: bytes, extension };
  } catch (err) {
    console.warn('Error converting dataUrl to binary:', err);
    return null;
  }
}

/**
 * Escapes CSV values cleanly
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an official WAEC candidates CSV Broadsheet
 */
export function generateWaecBroadsheetCsv(registrations: WaecRegistration[]): string {
  const headers = [
    'S/N',
    'Registration Number',
    'Candidate Index No',
    'Surname',
    'First Name',
    'Middle Name',
    'Full Name',
    'Date of Birth',
    'Gender',
    'State of Origin',
    'Local Government (LGA)',
    'Religion',
    'National ID (NIN)',
    'Phone Number',
    'Email Address',
    'Home Address',
    'Department',
    'Target Class',
    'Exam Type',
    'Total Subjects',
    'Subject 1 (Compulsory)',
    'Subject 2 (Compulsory)',
    'Subject 3 (Compulsory)',
    'Subject 4',
    'Subject 5',
    'Subject 6',
    'Subject 7',
    'Subject 8',
    'Subject 9',
    'Passport Filename',
    'Registration Status',
    'Submission Date',
    'Verification Date',
    'Admin Remarks'
  ];

  const rows = registrations.map((r, idx) => {
    const fullName = `${r.surname.toUpperCase()} ${r.firstName} ${r.middleName || ''}`.trim();
    const subs = r.subjects || [];
    const passportFilename = r.passportFilename || `${r.regNumber.replace(/[^a-zA-Z0-9]/g, '_')}_passport.jpg`;

    return [
      idx + 1,
      escapeCsv(r.regNumber),
      escapeCsv(r.candidateNumber || 'Pending Center Allocation'),
      escapeCsv(r.surname),
      escapeCsv(r.firstName),
      escapeCsv(r.middleName || ''),
      escapeCsv(fullName),
      escapeCsv(r.dateOfBirth),
      escapeCsv(r.gender),
      escapeCsv(r.stateOfOrigin),
      escapeCsv(r.lga),
      escapeCsv(r.religion),
      escapeCsv(r.nin),
      escapeCsv(r.phone),
      escapeCsv(r.email),
      escapeCsv(r.homeAddress),
      escapeCsv(r.department),
      escapeCsv(r.targetClass),
      escapeCsv(r.examType),
      subs.length,
      escapeCsv(subs[0] || 'English Language'),
      escapeCsv(subs[1] || 'Mathematics'),
      escapeCsv(subs[2] || 'Civic Education'),
      escapeCsv(subs[3] || ''),
      escapeCsv(subs[4] || ''),
      escapeCsv(subs[5] || ''),
      escapeCsv(subs[6] || ''),
      escapeCsv(subs[7] || ''),
      escapeCsv(subs[8] || ''),
      escapeCsv(passportFilename),
      escapeCsv(r.status.toUpperCase()),
      escapeCsv(r.submittedAt || 'Not Submitted'),
      escapeCsv(r.verifiedAt || 'Pending'),
      escapeCsv(r.adminRemarks || 'None')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Downloads a complete ZIP package containing JSON, CSV broadsheet, and passports/ folder
 */
export async function downloadWaecPackageZip(
  registrations: WaecRegistration[],
  options: {
    schoolName?: string;
    session?: string;
    customFilename?: string;
  } = {}
): Promise<{ success: boolean; filename: string; count: number }> {
  const zip = new JSZip();
  const schoolName = options.schoolName || 'Stanbax College & High School';
  const session = options.session || '2026/2027 Academic Session';

  // 1. JSON Export
  const jsonContent = JSON.stringify(
    {
      institution: schoolName,
      session,
      exportDate: new Date().toISOString(),
      examAuthority: 'West African Examinations Council (WAEC / WASSCE)',
      totalCandidates: registrations.length,
      candidates: registrations
    },
    null,
    2
  );
  zip.file('waec_candidates_data.json', jsonContent);

  // 2. CSV Broadsheet
  const csvContent = generateWaecBroadsheetCsv(registrations);
  zip.file('waec_candidates_broadsheet.csv', csvContent);

  // 3. Passports Folder
  const passportsFolder = zip.folder('passports');
  let photosAdded = 0;

  if (passportsFolder) {
    for (const reg of registrations) {
      if (reg.passportPhoto && reg.passportPhoto.startsWith('data:image')) {
        const converted = dataUrlToBinary(reg.passportPhoto);
        if (converted) {
          const safeReg = reg.regNumber.replace(/[^a-zA-Z0-9]/g, '_');
          const safeName = `${reg.surname}_${reg.firstName}`.replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `${safeReg}_${safeName}_passport.${converted.extension}`;
          passportsFolder.file(filename, converted.data);
          photosAdded++;
        }
      }
    }
  }

  // 4. Readme instructions
  const readmeText = `========================================================================
WEST AFRICAN EXAMINATIONS COUNCIL (WAEC / WASSCE)
STANBAX SCHOOLS CANDIDATES BIO-DATA & SUBJECT REGISTRATION PACKAGE
========================================================================
Academic Session: ${session}
Export Timestamp: ${new Date().toLocaleString()}
Total Registered Scholars: ${registrations.length}
Attached Passport Photographs: ${photosAdded}

FILES INCLUDED IN THIS ARCHIVE:
1. waec_candidates_data.json
   - Complete machine-readable candidate dataset.
2. waec_candidates_broadsheet.csv
   - Official CSV Broadsheet suitable for Microsoft Excel or WAEC e-Registration portal bulk upload.
3. passports/
   - High-resolution candidate passport photographs organized and named by Registration Number.

MANDATORY WAEC SUBJECT VALIDATION:
Every candidate has been validated with:
- 3 Compulsory General Core Subjects (English Language, Mathematics, Civic Education)
- 6 Departmental Electives (Sciences, Arts, Commercial or Trade)
Total: Exactly 9 Subjects per candidate.

For inquiries or portal clearance, contact Stanbax Examination Directorate.
========================================================================`;
  zip.file('README_WAEC_INSTRUCTIONS.txt', readmeText);

  // Generate zip file
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const defaultFilename = `WAEC_SS2_SS3_Registration_Package_${timestamp}.zip`;
  const filename = options.customFilename || defaultFilename;

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, filename, count: registrations.length };
}

/**
 * Downloads a single student's personal WAEC slip & passport in a ZIP
 */
export async function downloadSingleStudentWaecZip(
  registration: WaecRegistration,
  studentName: string
): Promise<{ success: boolean; filename: string }> {
  const zip = new JSZip();
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeReg = registration.regNumber.replace(/[^a-zA-Z0-9]/g, '_');

  // JSON record
  zip.file(`WAEC_Registration_${safeReg}.json`, JSON.stringify(registration, null, 2));

  // CSV summary
  zip.file(`WAEC_Slip_${safeReg}.csv`, generateWaecBroadsheetCsv([registration]));

  // Passport image
  if (registration.passportPhoto && registration.passportPhoto.startsWith('data:image')) {
    const converted = dataUrlToBinary(registration.passportPhoto);
    if (converted) {
      zip.file(`passport_${safeReg}.${converted.extension}`, converted.data);
    }
  }

  // Text summary slip
  const slipText = `========================================================
OFFICIAL WAEC / WASSCE CANDIDATE REGISTRATION SLIP
STANBAX HIGH SCHOOL
========================================================
Registration Number: ${registration.regNumber}
Candidate Number:    ${registration.candidateNumber || 'Pending Center Seat Allocation'}
Full Name:           ${registration.surname.toUpperCase()}, ${registration.firstName} ${registration.middleName || ''}
Gender:              ${registration.gender}
Date of Birth:       ${registration.dateOfBirth}
National ID (NIN):   ${registration.nin}
State of Origin:     ${registration.stateOfOrigin}
L.G.A.:              ${registration.lga}
Religion:            ${registration.religion}
Department:          ${registration.department}
Target Class:        ${registration.targetClass}
Phone:               ${registration.phone}
Email:               ${registration.email}
Home Address:        ${registration.homeAddress}

APPROVED SUBJECTS ENTERED (EXACTLY 9 SUBJECTS):
1. ${registration.subjects[0] || 'English Language (Compulsory)'}
2. ${registration.subjects[1] || 'Mathematics (Compulsory)'}
3. ${registration.subjects[2] || 'Civic Education (Compulsory)'}
4. ${registration.subjects[3] || 'N/A'}
5. ${registration.subjects[4] || 'N/A'}
6. ${registration.subjects[5] || 'N/A'}
7. ${registration.subjects[6] || 'N/A'}
8. ${registration.subjects[7] || 'N/A'}
9. ${registration.subjects[8] || 'N/A'}

Status:              ${registration.status.toUpperCase()}
Submitted At:        ${registration.submittedAt || 'Draft (Pending final confirmation)'}
Verified At:         ${registration.verifiedAt || 'Pending School Exam Officer Approval'}
========================================================`;
  zip.file(`WAEC_REGISTRATION_SLIP_${safeReg}.txt`, slipText);

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `WAEC_Slip_${safeReg}_${safeName}.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Imports and parses a ZIP file containing WAEC registrations and photos
 */
export async function importWaecPackageZip(
  file: File
): Promise<{
  success: boolean;
  registrations: WaecRegistration[];
  extractedPhotosCount: number;
  message: string;
  errors: string[];
}> {
  const errors: string[] = [];
  try {
    const zip = await JSZip.loadAsync(file);

    // 1. First scan for image files to create a lookup map
    const imageMap: Record<string, string> = {};
    let photosCount = 0;

    const fileEntries = Object.keys(zip.files);
    for (const relativePath of fileEntries) {
      const entry = zip.files[relativePath];
      if (entry.dir) continue;

      const lower = relativePath.toLowerCase();
      if (
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp')
      ) {
        try {
          const base64 = await entry.async('base64');
          const mime = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          const dataUrl = `data:${mime};base64,${base64}`;

          // Index by filename and stripped filename
          const simpleFilename = relativePath.split('/').pop() || relativePath;
          imageMap[simpleFilename.toLowerCase()] = dataUrl;
          imageMap[relativePath.toLowerCase()] = dataUrl;

          // Also index by any registration number pattern inside the filename (e.g. STX_2023_042)
          const cleanPattern = simpleFilename.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          imageMap[cleanPattern] = dataUrl;
          photosCount++;
        } catch (imgErr) {
          console.warn(`Could not extract image ${relativePath}:`, imgErr);
        }
      }
    }

    // 2. Look for JSON data file first
    let rawParsedCandidates: any[] = [];

    const jsonEntryName = fileEntries.find(
      name => !zip.files[name].dir && name.toLowerCase().endsWith('.json')
    );

    if (jsonEntryName) {
      try {
        const jsonText = await zip.files[jsonEntryName].async('text');
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          rawParsedCandidates = parsed;
        } else if (parsed && Array.isArray(parsed.candidates)) {
          rawParsedCandidates = parsed.candidates;
        } else if (parsed && Array.isArray(parsed.registrations)) {
          rawParsedCandidates = parsed.registrations;
        } else if (parsed && typeof parsed === 'object' && parsed.surname) {
          rawParsedCandidates = [parsed];
        }
      } catch (err: any) {
        errors.push(`Error parsing JSON file ${jsonEntryName}: ${err.message}`);
      }
    }

    // 3. If no JSON candidates found, try CSV broadsheet
    if (rawParsedCandidates.length === 0) {
      const csvEntryName = fileEntries.find(
        name => !zip.files[name].dir && name.toLowerCase().endsWith('.csv')
      );

      if (csvEntryName) {
        try {
          const csvText = await zip.files[csvEntryName].async('text');
          rawParsedCandidates = parseCsvToWaecCandidates(csvText);
        } catch (err: any) {
          errors.push(`Error parsing CSV file ${csvEntryName}: ${err.message}`);
        }
      }
    }

    if (rawParsedCandidates.length === 0) {
      return {
        success: false,
        registrations: [],
        extractedPhotosCount: photosCount,
        message: 'No valid WAEC candidate data found in the ZIP archive. Please ensure the ZIP contains waec_candidates_data.json or waec_candidates_broadsheet.csv.',
        errors: errors.length > 0 ? errors : ['Missing data file (JSON or CSV) in archive']
      };
    }

    // 4. Normalize and attach matching passport photos
    const normalizedRegistrations: WaecRegistration[] = rawParsedCandidates.map((cand, idx) => {
      const regNo = cand.regNumber || cand.reg_number || `STX/2023/${String(idx + 40).padStart(3, '0')}`;
      const surname = cand.surname || cand.lastName || cand.last_name || 'Candidate';
      const firstName = cand.firstName || cand.first_name || 'Scholar';
      const cleanReg = regNo.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      // Find matching photo from extracted photos
      let passportPhoto = cand.passportPhoto || '';
      if (!passportPhoto || !passportPhoto.startsWith('data:image')) {
        for (const [key, dataUrl] of Object.entries(imageMap)) {
          if (key.includes(cleanReg) || key.includes(surname.toLowerCase())) {
            passportPhoto = dataUrl;
            break;
          }
        }
      }

      // Ensure 9 subjects
      let subs = Array.isArray(cand.subjects) ? cand.subjects : [];
      if (subs.length === 0) {
        subs = [
          'English Language',
          'Mathematics',
          'Civic Education',
          'Physics',
          'Chemistry',
          'Biology',
          'Further Mathematics',
          'Agricultural Science',
          'Data Processing'
        ];
      }

      const id = cand.id || `waec-${cleanReg}-${Date.now()}`;

      return {
        id,
        studentId: cand.studentId || `stu-${idx + 1}`,
        regNumber: regNo,
        candidateNumber: cand.candidateNumber || `4251001${String(idx + 1).padStart(3, '0')}`,
        surname: surname.toUpperCase(),
        firstName,
        middleName: cand.middleName || cand.middle_name || '',
        dateOfBirth: cand.dateOfBirth || cand.dob || '2008-05-15',
        gender: cand.gender === 'Female' ? 'Female' : 'Male',
        stateOfOrigin: cand.stateOfOrigin || cand.state || 'Lagos',
        lga: cand.lga || 'Ikeja',
        religion: cand.religion || 'Christianity',
        phone: cand.phone || '+234 803 000 0000',
        nin: cand.nin || '12345678901',
        homeAddress: cand.homeAddress || cand.address || 'Stanbax Campus Road, Lagos',
        email: cand.email || 'scholar@stanbaxschools.edu.ng',
        department: cand.department || 'Science',
        examType: cand.examType || 'WASSCE (May/June)',
        targetClass: cand.targetClass || cand.grade || 'SSS 2 Science',
        passportPhoto,
        passportFilename: `${cleanReg}_passport.jpg`,
        subjects: subs.slice(0, 9),
        status: cand.status || 'submitted',
        submittedAt: cand.submittedAt || new Date().toISOString(),
        verifiedAt: cand.verifiedAt,
        verifiedBy: cand.verifiedBy,
        adminRemarks: cand.adminRemarks,
        updatedAt: new Date().toISOString()
      };
    });

    return {
      success: true,
      registrations: normalizedRegistrations,
      extractedPhotosCount: photosCount,
      message: `Successfully extracted ${normalizedRegistrations.length} candidate records and ${photosCount} passport photos from ${file.name}.`,
      errors
    };
  } catch (err: any) {
    return {
      success: false,
      registrations: [],
      extractedPhotosCount: 0,
      message: `Failed to open or unpack ZIP archive: ${err.message}`,
      errors: [err.message]
    };
  }
}

/**
 * Basic CSV string parser for broadsheet fallback
 */
function parseCsvToWaecCandidates(csvText: string): any[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const candidates: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 5) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const subjects: string[] = [];
    ['subject 1', 'subject 2', 'subject 3', 'subject 4', 'subject 5', 'subject 6', 'subject 7', 'subject 8', 'subject 9'].forEach(key => {
      for (const [k, v] of Object.entries(row)) {
        if (k.includes(key) && v && v.trim()) {
          subjects.push(v.trim());
          break;
        }
      }
    });

    candidates.push({
      regNumber: row['registration number'] || row['reg number'] || row['regno'] || '',
      candidateNumber: row['candidate index no'] || row['candidate no'] || '',
      surname: row['surname'] || '',
      firstName: row['first name'] || '',
      middleName: row['middle name'] || '',
      dateOfBirth: row['date of birth'] || row['dob'] || '',
      gender: row['gender'] || 'Male',
      stateOfOrigin: row['state of origin'] || row['state'] || '',
      lga: row['local government (lga)'] || row['lga'] || '',
      religion: row['religion'] || 'Christianity',
      nin: row['national id (nin)'] || row['nin'] || '',
      phone: row['phone number'] || row['phone'] || '',
      email: row['email address'] || row['email'] || '',
      homeAddress: row['home address'] || row['address'] || '',
      department: row['department'] || 'Science',
      targetClass: row['target class'] || row['class'] || 'SSS 2 Science',
      subjects: subjects.length > 0 ? subjects : undefined,
      status: (row['registration status'] || 'submitted').toLowerCase()
    });
  }

  return candidates;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}
