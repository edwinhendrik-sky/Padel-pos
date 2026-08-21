// --- KONFIGURASI AWAL & DATA DUMMY ---
const today = new Date();
const isoToday = today.toISOString().slice(0, 10);
const dateLabel = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const geofenceRadius = 150;

const defaultShifts = {
    pagi: { label: 'Pagi', start: '07:00', end: '15:00' },
    siang: { label: 'Siang', start: '11:00', end: '19:00' },
    midle: { label: 'Malam', start: '15:00', end: '23:00' }
};

let shifts = JSON.parse(localStorage.getItem('padel-shifts') || 'null') || defaultShifts;
shifts = Object.fromEntries(Object.entries(defaultShifts).map(([key, defaultShift]) => [key, { ...defaultShift, ...(shifts[key] || {}) }]));
if (shifts.midle.label === 'Middle' || shifts.midle.label === 'Sore') shifts.midle.label = 'Malam';

let weeklyOffDay = Number(localStorage.getItem('padel-weekly-off-day') ?? 0);
let clubLocations = JSON.parse(localStorage.getItem('padel-club-locations') || 'null') || [];
const legacyLocation = JSON.parse(localStorage.getItem('padel-club-location') || 'null');
if (!clubLocations.length && legacyLocation) clubLocations = [legacyLocation];
clubLocations = clubLocations.map((location, index) => ({ ...location, name: location.name || `Lokasi ${index + 1}`, radius: Number(location.radius) || geofenceRadius }));

const employees = [
    { id: 1, employeeId: 'PDL-0001', name: 'Nazwa Verlita', phone: '081234560001', role: 'Front Desk', shift: 'pagi', fixedSalary: 1200000, weekendAllowance: 25000, mealTransportAllowance: 10000, attendanceBonus: 300000, overtimeRate: 10000, overtimeHours: 0, otherAdjustment: -250000 },
    { id: 2, employeeId: 'PDL-0002', name: 'Selvi Nuraeni', phone: '081234560002', role: 'Front Desk', shift: 'siang', fixedSalary: 1200000, weekendAllowance: 25000, mealTransportAllowance: 10000, attendanceBonus: 300000, overtimeRate: 10000, overtimeHours: 0, otherAdjustment: -100000 },
    { id: 3, employeeId: 'PDL-0003', name: 'Mia Haryati', phone: '081234560003', role: 'Front Desk', shift: 'pagi', fixedSalary: 1200000, weekendAllowance: 25000, mealTransportAllowance: 10000, attendanceBonus: 300000, overtimeRate: 10000, overtimeHours: 0, otherAdjustment: 0 },
    { id: 4, employeeId: 'PDL-0004', name: 'Dewi', phone: '081234560004', role: 'Front Desk', shift: 'midle', fixedSalary: 1200000, weekendAllowance: 25000, mealTransportAllowance: 10000, attendanceBonus: 300000, overtimeRate: 10000, overtimeHours: 0, otherAdjustment: -150000 }
    { id: 5, employeeId: 'PDL-0005', name: 'Puja Lestari', phone: '081234560004', role: 'Front Desk', shift: 'midle', fixedSalary: 1200000, weekendAllowance: 25000, mealTransportAllowance: 10000, attendanceBonus: 300000, overtimeRate: 10000, overtimeHours: 0, otherAdjustment: -150000 }

];

const seedMembers = [
    { id: 1, name: 'Nazwa Verlita', phone: '081234567890', plan: 'Annual', expires: '2026-09-12', visits: 24 },
    { id: 2, name: 'Selvi Nuraeni', phone: '082112223333', plan: 'Monthly', expires: '2026-08-25', visits: 8 },
    { id: 3, name: 'Mia Haryati', phone: '081399887766', plan: 'Quarterly', expires: '2026-11-03', visits: 17 },
    { id: 4, name: 'Dewi', phone: '085677889900', plan: 'Monthly', expires: '2026-08-18', visits: 11 },
    { id: 5, name: 'Puja Lestari', phone: '081122334455', plan: 'Annual', expires: '2027-01-19', visits: 31 }
];

let employeeData = JSON.parse(localStorage.getItem('padel-employees') || 'null') || employees;
let mobileEmployeeId = Number(sessionStorage.getItem('padel-mobile-employee-id') || 0);

let attendance = JSON.parse(localStorage.getItem('padel-attendance') || 'null') || [
    { id: 1, date: isoToday, status: 'present', clockIn: '07:48', clockOut: '-', photo: '' },
    { id: 2, date: isoToday, status: 'present', clockIn: '08:02', clockOut: '-', photo: '' },
    { id: 3, date: isoToday, status: 'leave', clockIn: '-', clockOut: '-', photo: '' },
    { id: 4, date: isoToday, status: 'absent', clockIn: '-', clockOut: '-', photo: '' }
];

let members = JSON.parse(localStorage.getItem('padel-members') || 'null') || seedMembers;
let activities = JSON.parse(localStorage.getItem('padel-activities') || 'null') || [
    { icon: '+', text: 'Ardi Wijaya memperpanjang membership Annual', time: '12 menit lalu' },
    { icon: '◷', text: 'Nadia Sari melakukan check-in', time: '38 menit lalu' },
    { icon: '◎', text: 'Member baru, Dimas Nugroho bergabung', time: '1 jam lalu' }
];

const scheduleSlots = Object.keys(shifts).flatMap(shift => [0, 1, 2, 3, 4, 5, 6].map(weeklyOffDay => ({ shift, weeklyOffDay })));

employeeData = employeeData.map((person, index) => ({
    ...person,
    employeeId: person.employeeId || `PDL-${String(index + 1).padStart(4, '0')}`,
    pin: String(person.pin || '1234'),
    shift: shifts[person.shift] ? person.shift : person.shift === 'sore' ? 'midle' : index % 3 === 0 ? 'pagi' : index % 3 === 1 ? 'siang' : 'midle',
    weeklyOffDay: Number.isInteger(Number(person.weeklyOffDay)) ? Number(person.weeklyOffDay) : scheduleSlots[index % scheduleSlots.length].weeklyOffDay,
    bankName: person.bankName || '',
    accountNumber: person.accountNumber || '',
    accountHolder: person.accountHolder || '',
    fixedSalary: Number(person.fixedSalary ?? person.salary) || 5000000,
    weekendAllowance: 25000,
    mealTransportAllowance: 10000,
    attendanceBonus: Number(person.attendanceBonus) || 300000,
    overtimeRate: 10000,
    overtimeHours: Number(person.overtimeHours) || 0,
    otherAdjustment: Number(person.otherAdjustment ?? -(Number(person.deduction) || 0)) || 0
}));

attendance = attendance.map(record => ({
    id: record.id,
    date: record.date || isoToday,
    status: record.status || 'absent',
    clockIn: record.clockIn || record.in || '-',
    clockOut: record.clockOut || record.out || '-',
    photo: record.photo || ''
}));

const nextEmployeeId = () => {
    const highest = employeeData.reduce((max, person) => Math.max(max, Number(person.employeeId.replace('PDL-', '')) || 0), 0);
    return `PDL-${String(highest + 1).padStart(4, '0')}`;
};

function buildMonthlySchedule() {
    const month = isoToday.slice(0, 7);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const shiftKeys = Object.keys(shifts);
    const days = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const weekday = new Date(`${date}T00:00:00`).getDay();
        const ordered = [...employeeData].sort((left, right) => left.id - right.id);
        const assignments = ordered.map((person, index) => ({
            employeeId: person.id,
            shift: weekday === person.weeklyOffDay ? 'off' : shiftKeys[(day + index) % shiftKeys.length]
        }));
        days.push({ date, assignments });
    }
    return { month, days };
}

let monthlySchedule = JSON.parse(localStorage.getItem('padel-monthly-schedule') || 'null');
if (!monthlySchedule || monthlySchedule.month !== isoToday.slice(0, 7)) monthlySchedule = buildMonthlySchedule();

const scheduledAssignment = (person, date) => monthlySchedule.days.find(day => day.date === date)?.assignments.find(assignment => assignment.employeeId === person.id);
const monthKey = date => date.slice(0, 7);
const dayNumber = date => new Date(`${date}T00:00:00`).getDay();
const isScheduledWorkday = (date, offDay) => dayNumber(date) !== offDay;
const dayName = day => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][day];

const attendanceStats = person => {
    const currentMonth = isoToday.slice(0, 7);
    const offDay = Number.isInteger(Number(person.weeklyOffDay)) ? Number(person.weeklyOffDay) : weeklyOffDay;
    const records = attendance.filter(record => record.id === person.id && monthKey(record.date || isoToday) === currentMonth && record.status === 'present');
    const workdays = new Set(records.filter(record => isScheduledWorkday(record.date || isoToday, offDay) || dayNumber(record.date || isoToday) === offDay || record.replacement).map(record => record.date || isoToday));
    const weekendDays = new Set(records.filter(record => [0, 6].includes(dayNumber(record.date || isoToday))).map(record => record.date || isoToday));
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    let expectedWorkdays = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${currentMonth}-${String(day).padStart(2, '0')}`;
        if (isScheduledWorkday(date, offDay)) expectedWorkdays += 1;
    }
    return { attendedWorkdays: workdays.size, weekendDays: weekendDays.size, expectedWorkdays, offDay };
};

const payroll = person => {
    const stats = attendanceStats(person);
    const automatic = {
        fixedSalary: (person.fixedSalary / (stats.expectedWorkdays || 1)) * stats.attendedWorkdays,
        mealTransport: 10000 * stats.attendedWorkdays,
        weekend: person.weekendAllowance * stats.weekendDays,
        attendanceBonus: stats.attendedWorkdays === stats.expectedWorkdays ? person.attendanceBonus : 0,
        overtime: person.overtimeRate * person.overtimeHours,
        otherAdjustment: person.otherAdjustment
    };
    const values = { ...automatic, ...(person.manualPayroll || {}) };
    return { ...stats, ...values, automatic, isManual: Boolean(person.manualPayroll), net: values.fixedSalary + values.weekend + values.mealTransport + values.attendanceBonus + values.overtime + values.otherAdjustment };
};

const money = value => `Rp ${Number(value).toLocaleString('id-ID')}`;
const reportDate = date => new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const reportDefaults = () => {
    const end = isoToday;
    const startDate = new Date(`${end}T00:00:00`);
    startDate.setDate(startDate.getDate() - 29);
    return { start: startDate.toISOString().slice(0, 10), end };
};

const minutesNow = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
};
const minutesFromTime = value => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

let replacementMode = false;
const checkShiftWindow = (person, action, replacement = replacementMode) => {
    const daily = scheduledAssignment(person, isoToday);
    const assignedShift = daily?.shift && daily.shift !== 'off' ? daily.shift : person.shift;
    const shift = shifts[assignedShift] || shifts.pagi;
    const current = minutesNow();
    const start = minutesFromTime(shift.start);
    const end = minutesFromTime(shift.end);
    const earliestIn = start - 60;
    const latestOut = end + 120;

    if (action === 'in' && new Date().getDay() === Number(person.weeklyOffDay) && !replacement) {
        throw new Error(`Hari ini hari libur personal kamu (${dayName(Number(person.weeklyOffDay))}). Centang masuk sebagai pengganti jika ditugaskan.`);
    }

    const valid = action === 'in' ? current >= earliestIn && current <= end : current >= start && current <= latestOut;
    if (!valid) {
        const period = action === 'in' ? `${shift.start}–${shift.end}` : `${shift.start}–${String(Math.floor(latestOut / 60)).padStart(2, '0')}:${String(latestOut % 60).padStart(2, '0')}`;
        throw new Error(`Di luar jam ${shift.label}. Waktu ${action === 'in' ? 'masuk' : 'pulang'} yang diizinkan ${period}.`);
    }
};

const save = () => {
    localStorage.setItem('padel-shifts', JSON.stringify(shifts));
    localStorage.setItem('padel-weekly-off-day', String(weeklyOffDay));
    localStorage.setItem('padel-monthly-schedule', JSON.stringify(monthlySchedule));
    localStorage.setItem('padel-club-locations', JSON.stringify(clubLocations));
    localStorage.setItem('padel-employees', JSON.stringify(employeeData));
    localStorage.setItem('padel-members', JSON.stringify(members));
    localStorage.setItem('padel-attendance', JSON.stringify(attendance));
    localStorage.setItem('padel-activities', JSON.stringify(activities));
};

const initials = name => name.split(' ').map(part => part[0]).slice(0, 2).join('');

const distanceInMeters = (from, to) => {
    const earthRadius = 6371000;
    const latitudeDelta = (to.latitude - from.latitude) * Math.PI / 180;
    const longitudeDelta = (to.longitude - from.longitude) * Math.PI / 180;
    const latitudeOne = from.latitude * Math.PI / 180;
    const latitudeTwo = to.latitude * Math.PI / 180;
    const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const parseMapsCoordinates = value => {
    const match = value.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || value.match(/(?:q|query|place)=[^/]*?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || value.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
    return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : null;
};

const getCurrentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Perangkat tidak mendukung GPS.'));
        return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Izin lokasi diperlukan untuk absensi.')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});

const checkClubDistance = async () => {
    if (!clubLocations.length) throw new Error('Lokasi club belum diatur oleh admin.');
    const position = await getCurrentPosition();
    const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    const distances = clubLocations.map(location => distanceInMeters(location, current));
    const nearestIndex = distances.indexOf(Math.min(...distances));
    const nearest = distances[nearestIndex];
    const allowedRadius = clubLocations[nearestIndex].radius;
    if (nearest > allowedRadius) throw new Error(`Kamu berada sekitar ${Math.round(nearest)} meter dari lokasi club terdekat. Radius lokasi ini ${allowedRadius} meter.`);
    return nearest;
};

// --- RENDER DOKUMEN & TAMPILAN ---
function renderLocationStatus() {
    const title = document.querySelector('#locationTitle');
    const status = document.querySelector('#locationStatus');
    const list = document.querySelector('#locationList');
    if (!title || !status || !list) return;
    title.textContent = clubLocations.length ? `${clubLocations.length} lokasi absensi aktif` : 'Lokasi club belum diatur';
    status.textContent = clubLocations.length ? 'Clock in/out diterima dari radius sesuai masing-masing titik.' : 'Admin harus mengatur lokasi saat berada di venue.';
    list.innerHTML = clubLocations.map((location, index) => `<span class="location-chip" title="${location.latitude}, ${location.longitude}">${location.name} · ${location.radius}m <button type="button" data-remove-location="${index}" title="Hapus lokasi">×</button></span>`).join('');
    document.querySelector('#locationBanner')?.classList.toggle('configured', Boolean(clubLocations.length));
    const setBtn = document.querySelector('#setLocationButton');
    if (setBtn) {
        setBtn.disabled = clubLocations.length >= 2;
        setBtn.textContent = clubLocations.length >= 2 ? '⌖ Maks. 2 lokasi' : '⌖ Tambah lokasi';
    }
}

function renderShiftSettings() {
    const container = document.querySelector('#shiftSettingsGrid');
    if (!container) return;
    container.innerHTML = Object.entries(shifts).map(([key, shift]) => `<div class="shift-setting-card ${key}"><b>Shift ${shift.label}</b><span>${key === 'midle' ? 'Shift tengah / malam' : `Periode kerja shift ${shift.label.toLowerCase()}`}</span><label>Mulai<input type="time" data-shift-key="${key}" data-shift-part="start" value="${shift.start}"></label><label>Selesai<input type="time" data-shift-key="${key}" data-shift-part="end" value="${shift.end}"></label></div>`).join('');
}

const daysLeft = date => Math.ceil((new Date(`${date}T23:59:59`) - new Date()) / 86400000);
const memberState = member => {
    const days = daysLeft(member.expires);
    return days < 0 ? 'expired' : days <= 7 ? 'expiring' : 'active';
};
const stateText = state => ({ present: 'Hadir', absent: 'Belum hadir', leave: 'Izin', active: 'Aktif', expiring: 'Segera berakhir', expired: 'Expired' }[state]);
const formatDate = value => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

function render() {
    const active = members.filter(member => memberState(member) === 'active').length;
    const expiring = members.filter(member => memberState(member) === 'expiring').length;
    const present = attendance.filter(person => person.status === 'present').length;

    if (document.querySelector('#currentDate')) document.querySelector('#currentDate').textContent = dateLabel;
    if (document.querySelector('#weekday')) document.querySelector('#weekday').textContent = today.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
    if (document.querySelector('#headingDate')) document.querySelector('#headingDate').textContent = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    if (document.querySelector('#activeMembersStat')) document.querySelector('#activeMembersStat').textContent = active;
    if (document.querySelector('#expiringStat')) document.querySelector('#expiringStat').textContent = expiring;
    if (document.querySelector('#presentStat')) document.querySelector('#presentStat').textContent = `${present}/${attendance.length}`;
    if (document.querySelector('#revenueStat')) document.querySelector('#revenueStat').textContent = `Rp ${(active * 850000).toLocaleString('id-ID')}`;
    if (document.querySelector('#attendanceSummary')) document.querySelector('#attendanceSummary').textContent = `${present} dari ${attendance.length} karyawan sudah check-in`;

    if (document.querySelector('#attendancePreview')) {
        document.querySelector('#attendancePreview').innerHTML = attendance.slice(0, 4).map(record => {
            const person = employeeData.find(item => item.id === record.id);
            return `<div class="attendance-row"><div class="person"><span class="person-avatar">${initials(person ? person.name : 'UK')}</span>${person ? person.name : 'Unknown'}</div><span class="time">${record.clockIn}</span><span class="status ${record.status}">${stateText(record.status)}</span></div>`;
        }).join('');
    }

    if (document.querySelector('#attendanceTable')) {
        document.querySelector('#attendanceTable').innerHTML = attendance.map(record => {
            const person = employeeData.find(item => item.id === record.id);
            if (!person) return '';
            const action = record.status === 'leave' ? '<span class="time">Izin</span>' : record.clockIn === '-' ? `<button class="small-action" data-clock="in" data-employee-id="${person.id}">Clock in</button>` : record.clockOut === '-' ? `<button class="small-action" data-clock="out" data-employee-id="${person.id}">Clock out</button>` : '<span class="time">Selesai</span>';
            return `<tr><td><div class="td-main"><span class="person-avatar">${initials(person.name)}</span>${person.name}${record.photo ? '<span class="photo-check" title="Selfie tersimpan">●</span>' : ''}</div></td><td>${person.employeeId}</td><td>${person.role}</td><td>${record.clockIn}</td><td>${record.clockOut}</td><td><span class="status ${record.status}">${stateText(record.status)}</span></td><td>${action}</td></tr>`;
        }).join('');
    }

    const totalPayroll = employeeData.reduce((total, person) => total + payroll(person).net, 0);
    const totalOvertime = employeeData.reduce((total, person) => total + payroll(person).overtime, 0);
    const monthlyWorkdays = employeeData.length ? payroll(employeeData[0]).expectedWorkdays : 0;

    if (document.querySelector('#payrollSummary')) {
        document.querySelector('#payrollSummary').innerHTML = `<div><span class="summary-label">TOTAL PAYROLL BULAN INI</span><strong>${money(totalPayroll)}</strong><small>${employeeData.length} karyawan · ${monthlyWorkdays} hari kerja bulanan</small></div><div><span class="summary-label">TOTAL LEMBUR</span><strong>${money(totalOvertime)}</strong><small>${employeeData.reduce((total, person) => total + person.overtimeHours, 0)} jam lembur</small></div><div><span class="summary-label">RATA-RATA TAKE-HOME PAY</span><strong>${money(employeeData.length ? totalPayroll / employeeData.length : 0)}</strong><small>Prorata hari hadir</small></div>`;
    }

    if (document.querySelector('#employeeDataTable')) {
        document.querySelector('#employeeDataTable').innerHTML = employeeData.map(person => {
            const result = payroll(person);
            const shift = shifts[person.shift] || shifts.pagi;
            return `<tr><td>${person.employeeId}</td><td><div class="td-main"><span class="person-avatar">${initials(person.name)}</span>${person.name}</div></td><td>${person.role}</td><td><span class="shift-badge ${person.shift}">${shift.label}</span><small class="muted">${shift.start}–${shift.end}</small></td><td><span class="offday-badge">${dayName(result.offDay)}</span></td><td><b>${result.attendedWorkdays} / ${result.expectedWorkdays}</b><small class="muted">hari kerja · ${result.weekendDays} hari weekend</small></td><td>${money(result.fixedSalary)}</td><td>${money(result.weekend)}<small class="muted">${person.weekendAllowance}/hari</small></td><td>${money(result.mealTransport)}</td><td>${money(result.attendanceBonus)}<small class="muted">${result.attendedWorkdays === result.expectedWorkdays ? '100%' : 'hangus'}</small></td><td>${money(result.overtime)}<small class="muted">${person.overtimeHours} jam</small></td><td class="adjustment-cell ${result.otherAdjustment < 0 ? 'negative' : 'positive'}">${money(result.otherAdjustment)}</td><td><strong class="net-pay">${money(result.net)}</strong>${result.isManual ? '<small class="manual-badge">Manual</small>' : ''}</td><td><span class="status active">Aktif</span></td><td><button class="action-button" data-edit-payroll="${person.id}" title="Edit nominal payroll">▤</button><button class="action-button" data-edit-employee="${person.id}" title="Edit data karyawan">✎</button><button class="action-button" data-delete-employee="${person.id}" title="Hapus karyawan">×</button></td></tr>`;
        }).join('');
    }

    renderMonthlySchedule();
    renderBankActions();
    renderMembers();

    if (document.querySelector('#activityList')) {
        document.querySelector('#activityList').innerHTML = activities.slice(0, 4).map(item => `<div class="activity-item"><span class="activity-icon">${item.icon}</span><p>${item.text}<br><small>${item.time}</small></p></div>`).join('');
    }

    renderLocationStatus();
    renderShiftSettings();

    const shiftSelect = document.querySelector('#employeeForm select[name="shift"]');
    if (shiftSelect) {
        const currentShift = shiftSelect.value;
        shiftSelect.innerHTML = Object.entries(shifts).map(([key, shift]) => `<option value="${key}">Shift ${shift.label} · ${shift.start}–${shift.end}</option>`).join('');
        if (shifts[currentShift]) shiftSelect.value = currentShift;
    }

    const weeklyOffSelect = document.querySelector('#weeklyOffDay');
    if (weeklyOffSelect) weeklyOffSelect.value = String(weeklyOffDay);

    renderMobileEmployee();
}

function renderMonthlySchedule() {
    const monthLabel = new Date(`${monthlySchedule.month}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const label = document.querySelector('#scheduleMonthLabel');
    const head = document.querySelector('#monthlyScheduleHead');
    const body = document.querySelector('#monthlyScheduleBody');
    const balance = document.querySelector('#scheduleBalance');
    if (!label || !head || !body || !balance) return;

    label.textContent = monthLabel;
    head.innerHTML = `<tr><th>Tanggal</th>${employeeData.map(person => `<th>${person.name}</th>`).join('')}</tr>`;
    body.innerHTML = monthlySchedule.days.map(day => {
        const date = new Date(`${day.date}T00:00:00`);
        const assignments = employeeData.map(person => {
            const assignment = day.assignments.find(item => item.employeeId === person.id);
            const text = assignment?.shift === 'off' ? 'Libur' : shifts[assignment?.shift]?.label || '-';
            return `<td><span class="schedule-cell ${assignment?.shift === 'off' ? 'off' : assignment?.shift}">${text}</span></td>`;
        }).join('');
        return `<tr><td><b>${date.toLocaleDateString('id-ID', { day: '2-digit' })}</b><small>${dayName(date.getDay())}</small></td>${assignments}</tr>`;
    }).join('');

    balance.innerHTML = employeeData.map(person => {
        const counts = monthlySchedule.days.reduce((result, day) => {
            const shift = day.assignments.find(item => item.employeeId === person.id)?.shift || 'off';
            result[shift] = (result[shift] || 0) + 1;
            return result;
        }, {});
        return `<div class="balance-card"><b>${person.name}</b><span>Pagi ${counts.pagi || 0} · Siang ${counts.siang || 0} · Malam ${counts.midle || 0} · Libur ${counts.off || 0}</span></div>`;
    }).join('');
}

function renderBankActions() {
    document.querySelectorAll('#employeeDataTable tr').forEach((row, index) => {
        const person = employeeData[index];
        if (!person) return;
        const actionCell = row.lastElementChild;
        const button = document.createElement('button');
        button.className = 'action-button';
        button.dataset.editBank = person.id;
        button.title = person.bankName && person.accountNumber && person.accountHolder ? 'Edit rekening bank' : 'Lengkapi rekening bank';
        button.textContent = '▣';
        actionCell?.prepend(button);

        const nameCell = row.children[1];
        if (nameCell) {
            const bankStatus = document.createElement('small');
            bankStatus.className = `bank-status ${button.title.startsWith('Edit') ? 'complete' : 'missing'}`;
            bankStatus.textContent = person.bankName && person.accountNumber && person.accountHolder ? `${person.bankName} · ${person.accountNumber}` : 'Rekening belum lengkap';
            nameCell.appendChild(bankStatus);
        }
    });
}

function renderMembers() {
    const searchEl = document.querySelector('#memberSearch');
    const filterEl = document.querySelector('#memberFilter');
    const memberTableEl = document.querySelector('#memberTable');
    if (!memberTableEl) return;

    const query = (searchEl?.value || '').toLowerCase();
    const filter = filterEl?.value || 'all';

    memberTableEl.innerHTML = members.filter(member => (filter === 'all' || memberState(member) === filter) && `${member.name} ${member.plan}`.toLowerCase().includes(query)).map(member => {
        const state = memberState(member);
        return `<tr><td><div class="td-main"><span class="person-avatar">${initials(member.name)}</span><span>${member.name}<small class="muted">${member.phone}</small></span></div></td><td>${member.plan}</td><td>${formatDate(member.expires)}</td><td>${member.visits}x</td><td><span class="status ${state}">${stateText(state)}</span></td><td><button class="action-button" data-delete-member="${member.id}" title="Hapus member">×</button></td></tr>`;
    }).join('') || '<tr><td colspan="6">Tidak ada member yang cocok.</td></tr>';
}

function renderAttendanceReport() {
    const startInput = document.querySelector('#reportStartDate');
    const endInput = document.querySelector('#reportEndDate');
    const filterInput = document.querySelector('#reportEmployeeFilter');
    if (!startInput || !endInput || !filterInput) return;

    const start = startInput.value;
    const end = endInput.value;
    const employeeId = filterInput.value;

    const records = attendance.filter(record => {
        const date = record.date || isoToday;
        return date >= start && date <= end && (employeeId === 'all' || record.id === Number(employeeId));
    }).sort((left, right) => (right.date || '').localeCompare(left.date || ''));

    const counts = records.reduce((result, record) => {
        result[record.status] = (result[record.status] || 0) + 1;
        return result;
    }, {});

    if (document.querySelector('#reportPeriodText')) document.querySelector('#reportPeriodText').textContent = `Periode ${reportDate(start)} sampai ${reportDate(end)} · ${records.length} record absensi`;
    if (document.querySelector('#attendanceReportCount')) document.querySelector('#attendanceReportCount').textContent = `${records.length} record ditemukan`;
    if (document.querySelector('#attendanceReportSummary')) document.querySelector('#attendanceReportSummary').innerHTML = `<div class="report-stat present"><span>Hadir</span><strong>${counts.present || 0}</strong></div><div class="report-stat leave"><span>Izin</span><strong>${counts.leave || 0}</strong></div><div class="report-stat absent"><span>Belum hadir</span><strong>${counts.absent || 0}</strong></div><div class="report-stat replacement"><span>Pengganti</span><strong>${records.filter(record => record.replacement).length}</strong></div>`;

    if (document.querySelector('#attendanceReportTable')) {
        document.querySelector('#attendanceReportTable').innerHTML = records.map(record => {
            const person = employeeData.find(item => item.id === record.id);
            return `<tr><td>${reportDate(record.date || isoToday)}</td><td><div class="td-main"><span class="person-avatar">${initials(person?.name || '-')}</span>${person?.name || 'Karyawan dihapus'}</div></td><td>${person?.employeeId || '-'}</td><td>${record.clockIn}</td><td>${record.clockOut}</td><td><span class="status ${record.status}">${stateText(record.status)}</span></td><td>${record.replacement ? '<span class="report-tag replacement">Pengganti</span>' : 'Reguler'}</td><td>${record.photo ? '<span class="report-tag verified">Selfie tersimpan</span>' : '<span class="report-tag pending">Tanpa foto</span>'}</td></tr>`;
        }).join('') || '<tr><td colspan="8">Tidak ada data absensi pada periode ini.</td></tr>';
    }
}

function initializeAttendanceReport() {
    const defaults = reportDefaults();
    if (document.querySelector('#reportStartDate')) document.querySelector('#reportStartDate').value = defaults.start;
    if (document.querySelector('#reportEndDate')) document.querySelector('#reportEndDate').value = defaults.end;
    if (document.querySelector('#reportEmployeeFilter')) document.querySelector('#reportEmployeeFilter').innerHTML = `<option value="all">Semua karyawan</option>${employeeData.map(person => `<option value="${person.id}">${person.employeeId} · ${person.name}</option>`).join('')}`;
    renderAttendanceReport();
}

function renderMobileReport() {
    const person = employeeData.find(item => item.id === mobileEmployeeId);
    if (!person) return;
    const startInput = document.querySelector('#mobileReportStart');
    const endInput = document.querySelector('#mobileReportEnd');
    const start = startInput ? startInput.value : isoToday;
    const end = endInput ? endInput.value : isoToday;

    const records = attendance.filter(record => record.id === person.id && (record.date || isoToday) >= start && (record.date || isoToday) <= end).sort((left, right) => (right.date || '').localeCompare(left.date || ''));
    const counts = records.reduce((result, record) => {
        result[record.status] = (result[record.status] || 0) + 1;
        return result;
    }, {});

    if (document.querySelector('#mobileReportSummary')) {
        document.querySelector('#mobileReportSummary').innerHTML = `<span>Hadir <b>${counts.present || 0}</b></span><span>Izin <b>${counts.leave || 0}</b></span><span>Absen <b>${counts.absent || 0}</b></span>`;
    }
    if (document.querySelector('#mobileReportList')) {
        document.querySelector('#mobileReportList').innerHTML = records.map(record => `<div class="mobile-report-item"><b>${reportDate(record.date || isoToday)}</b><span class="status ${record.status}">${stateText(record.status)}</span><small>${record.clockIn} - ${record.clockOut}${record.replacement ? ' · Pengganti' : ''}</small></div>`).join('') || '<p class="muted">Belum ada record pada periode ini.</p>';
    }
}

function initializeMobileAuth() {
    const loginCard = document.querySelector('#mobileLogin');
    const dashboardCard = document.querySelector('#mobileDashboard');
    const reportCard = document.querySelector('#mobileReportCard');

    if (!loginCard || !dashboardCard) return;

    const loggedIn = employeeData.some(person => person.id === mobileEmployeeId);

    if (loggedIn) {
        loginCard.classList.add('hidden');
        dashboardCard.classList.remove('hidden');
        reportCard?.classList.remove('hidden');
        renderMobileEmployee();
        renderMobileReport();
    } else {
        loginCard.classList.remove('hidden');
        dashboardCard.classList.add('hidden');
        reportCard?.classList.add('hidden');
    }
}

function renderMobileEmployee() {
    const person = employeeData.find(item => item.id === mobileEmployeeId);
    if (!person) return;

    const record = attendance.find(item => item.id === person.id) || { status: 'absent', clockIn: '-', clockOut: '-' };

    if (document.querySelector('#mobileEmployeeName')) document.querySelector('#mobileEmployeeName').textContent = `Halo, ${person.name.split(' ')[0]}!`;
    if (document.querySelector('#mobileDate')) document.querySelector('#mobileDate').textContent = `${dateLabel} · ${person.role}`;
    if (document.querySelector('#mobileAttendanceStatus')) document.querySelector('#mobileAttendanceStatus').textContent = record.status === 'leave' ? 'Sedang izin' : record.clockIn === '-' ? 'Belum clock in' : record.clockOut === '-' ? 'Sedang bekerja' : 'Shift selesai';
    if (document.querySelector('#mobileAttendanceTime')) document.querySelector('#mobileAttendanceTime').textContent = record.clockIn === '-' ? 'Belum ada jam masuk' : record.clockOut === '-' ? `Clock in ${record.clockIn}` : `${record.clockIn} - ${record.clockOut}`;

    const clockInBtn = document.querySelector('#mobileClockIn');
    const clockOutBtn = document.querySelector('#mobileClockOut');

    if (clockInBtn) {
        clockInBtn.dataset.employeeId = person.id;
        clockInBtn.disabled = record.status === 'leave' || record.clockIn !== '-';
    }
    if (clockOutBtn) {
        clockOutBtn.dataset.employeeId = person.id;
        clockOutBtn.disabled = record.status === 'leave' || record.clockIn === '-' || record.clockOut !== '-';
    }

    if (document.querySelector('#mobileLocationInfo')) document.querySelector('#mobileLocationInfo').textContent = clubLocations.length ? `${clubLocations.length} lokasi aktif · radius ${geofenceRadius} meter` : 'Lokasi club harus diatur admin';
}

function showView(view) {
    document.querySelectorAll('.view').forEach(item => item.classList.remove('active-view'));
    const target = document.querySelector(`#${view}View`);
    if (target) target.classList.add('active-view');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
    document.querySelector('.sidebar')?.classList.remove('open');
}

// --- EVENT LISTENERS & LOGIKA INTERAKSI ---
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.viewTarget)));
document.querySelector('.mobile-menu')?.addEventListener('click', () => document.querySelector('.sidebar')?.classList.toggle('open'));

// Form Login & Logout Mobile
document.querySelector('#mobileLoginForm')?.addEventListener('submit', event => {
    event.preventDefault();

    const inputId = document.querySelector('#inputEmployeeId').value.trim().toUpperCase();
    const inputPin = document.querySelector('#inputPin').value.trim();
    const message = document.querySelector('#mobileLoginMessage');

    const employee = employeeData.find(person => person.employeeId.toUpperCase() === inputId && person.pin === inputPin);

    if (!employee) {
        if (message) message.textContent = 'ID karyawan atau PIN salah.';
        return;
    }

    mobileEmployeeId = employee.id;
    sessionStorage.setItem('padel-mobile-employee-id', String(employee.id));

    if (message) message.textContent = '';

    document.querySelector('#mobileLogin')?.classList.add('hidden');
    document.querySelector('#mobileDashboard')?.classList.remove('hidden');
    document.querySelector('#mobileReportCard')?.classList.remove('hidden');

    renderMobileEmployee();
    renderMobileReport();
});

document.querySelector('#mobileLogout')?.addEventListener('click', () => {
    mobileEmployeeId = 0;
    sessionStorage.removeItem('padel-mobile-employee-id');

    document.querySelector('#mobileLogin')?.classList.remove('hidden');
    document.querySelector('#mobileDashboard')?.classList.add('hidden');
    document.querySelector('#mobileReportCard')?.classList.add('hidden');
    document.querySelector('#mobileLoginForm')?.reset();
});

// Modal Selfies & Presensi
let clockAction = 'in';

document.addEventListener('click', event => {
    const clockButton = event.target.closest('[data-clock]');
    if (clockButton) {
        const person = employeeData.find(item => item.id === Number(clockButton.dataset.employeeId));
        clockAction = clockButton.dataset.clock;
        
        replacementMode = clockAction === 'in' && Boolean(document.querySelector('#mobileReplacement')?.checked);
        if (document.querySelector('#clockForm [name="replacement"]')) {
            document.querySelector('#clockForm [name="replacement"]').checked = replacementMode;
        }

        if (document.querySelector('#clockTitle')) document.querySelector('#clockTitle').textContent = `Clock ${clockAction.toUpperCase()}`;
        if (document.querySelector('#clockDescription')) document.querySelector('#clockDescription').textContent = `${person ? person.name : ''} · ${person ? person.role : ''}`;
        if (document.querySelector('#clockForm [name="employeeId"]')) document.querySelector('#clockForm [name="employeeId"]').value = person ? person.id : '';
        
        document.querySelector('#clockModal')?.classList.add('open');
    }
});

document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => button.closest('.modal-backdrop')?.classList.remove('open')));

document.querySelector('#selfieInput')?.addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.querySelector('#selfiePreview');
        if (preview) {
            preview.src = reader.result;
            preview.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
});

document.querySelector('#clockForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const photo = document.querySelector('#selfiePreview')?.src;
    const locationMessage = document.querySelector('#clockLocationMessage');
    const person = employeeData.find(item => item.id === Number(form.employeeId.value));

    if (!photo) {
        document.querySelector('#selfieInput')?.reportValidity();
        return;
    }

    if (locationMessage) {
        locationMessage.className = 'text-xs text-amber-400 font-medium';
        locationMessage.textContent = 'Memeriksa shift dan lokasi perangkat...';
    }
    
    form.querySelector('[type="submit"]').disabled = true;

    try {
        checkShiftWindow(person, clockAction);
        await checkClubDistance();

        const record = attendance.find(item => item.id === Number(form.employeeId.value));
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        if (record) {
            record.status = 'present';
            record.photo = photo;
            record.replacement = clockAction === 'in' && replacementMode;
            if (clockAction === 'in') record.clockIn = time;
            else record.clockOut = time;
        }

        activities.unshift({ icon: '◷', text: `${person.name} melakukan clock ${clockAction}`, time: 'Baru saja' });
        save();
        
        form.reset();
        replacementMode = false;
        if (document.querySelector('#selfiePreview')) {
            document.querySelector('#selfiePreview').src = '';
            document.querySelector('#selfiePreview').classList.add('hidden');
        }
        document.querySelector('#clockModal')?.classList.remove('open');
        render();
        alert(`Presensi Clock ${clockAction.toUpperCase()} Berhasil!`);
    } catch (error) {
        if (locationMessage) {
            locationMessage.className = 'text-xs text-rose-400 font-medium';
            locationMessage.textContent = error.message;
        }
    } finally {
        form.querySelector('[type="submit"]').disabled = false;
    }
});

// INISIALISASI AWAL
render();
initializeAttendanceReport();
initializeMobileAuth();