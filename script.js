// ============================================================================
// LTC Student Management System - Frontend Script (Fixed Version)
// Version: 7.1 - Fixed Swal error
// ============================================================================

// ==================== CONFIGURATION ====================
// 🔴 IMPORTANT: ใส่ URL ที่ได้จากการ Deploy GAS ตรงนี้!!!
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwunoABBZP-xXf-Y9NsBJuU2MMwhtMyUolfypSZZVHnbmTwDnDYy-WxuFCA-YO0xBpbWQ/exec';

// ตัวแปร Global
let studentsData = [];
let currentUserRole = 'guest';
let currentUserName = '';
let levelChart = null;
let majorChart = null;

// ==================== Notification ====================

function showNotification(type, message) {
    if (typeof Swal !== 'undefined' && Swal.fire) {
        Swal.fire({
            icon: type,
            title: type === 'success' ? 'สำเร็จ' : (type === 'error' ? 'ผิดพลาด' : (type === 'warning' ? 'คำเตือน' : 'แจ้งเตือน')),
            text: message,
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
        });
    } else {
        console.log(`${type}: ${message}`);
        alert(message);
    }
}

// ==================== ฟังก์ชันเรียก API ====================

async function callAPI(action, data = {}, method = 'GET') {
    try {
        let url = `${GAS_URL}?action=${action}`;
        
        if (method === 'GET' && Object.keys(data).length > 0) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined && value !== null && value !== '') {
                    params.append(key, value);
                }
            }
            const paramString = params.toString();
            if (paramString) {
                url += `&${paramString}`;
            }
        }
        
        const options = {
            method: method,
            mode: 'cors'
        };
        
        if (method === 'POST') {
            // หลีกเลี่ยง CORS Preflight (OPTIONS) โดยใช้ Content-Type: text/plain
            options.headers = {
                'Content-Type': 'text/plain;charset=utf-8'
            };
            options.body = JSON.stringify({ action, ...data });
        }
        
        console.log(`Calling API: ${method} ${url}`);
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'เกิดข้อผิดพลาด');
        }
        
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        showNotification('error', `เกิดข้อผิดพลาด: ${error.message}`);
        throw error;
    }
}

async function testAPIConnection() {
    try {
        const result = await callAPI('test');
        console.log('API Test Result:', result);
        showNotification('success', '✅ เชื่อมต่อ API สำเร็จ');
        return true;
    } catch (error) {
        console.error('API Test Failed:', error);
        showNotification('error', '❌ เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบ URL');
        return false;
    }
}

// ==================== ฟังก์ชันโหลดข้อมูล ====================

async function loadStudentsData() {
    try {
        showLoading(true);
        console.log('Fetching from:', GAS_URL);
        
        studentsData = await callAPI('getStudents', {}, 'GET');
        console.log('Raw data received:', studentsData);
        
        if (Array.isArray(studentsData)) {
            studentsData = studentsData.map(student => {
                if (student.room && typeof student.room === 'string' && student.room.includes('T')) {
                    student.room = '';
                }
                if (student.room && typeof student.room === 'object') {
                    student.room = '';
                }
                if (student.student_code) {
                    student.student_code = String(student.student_code);
                }
                if (student.phone) {
                    student.phone = String(student.phone);
                }
                return student;
            });
        }
        
        console.log('Processed students:', studentsData.length, 'records');
        displayStudentsTable();
        updateDashboard();
        updateFilters();
        showLoading(false);
        return studentsData;
    } catch (error) {
        console.error('Load data error:', error);
        showLoading(false);
        showNotification('error', 'ไม่สามารถโหลดข้อมูลได้: ' + error.message);
        return [];
    }
}

function showLoading(show) {
    const tbody = document.getElementById('studentTableBody');
    if (show && tbody && (!studentsData || studentsData.length === 0)) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
    }
}

function updateFilters() {
    if (!studentsData || studentsData.length === 0) return;
    
    const levels = [...new Set(studentsData.map(s => s.level).filter(l => l && l !== '2026-05-31T17:00:00.000Z'))].sort();
    const levelSelect = document.getElementById('filterLevel');
    if (levelSelect) {
        const currentValue = levelSelect.value;
        levelSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            if (currentValue === level) option.selected = true;
            levelSelect.appendChild(option);
        });
    }
    
    const majors = [...new Set(studentsData.map(s => s.major).filter(m => m))].sort();
    const majorSelect = document.getElementById('filterMajor');
    if (majorSelect) {
        const currentValue = majorSelect.value;
        majorSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        majors.forEach(major => {
            const option = document.createElement('option');
            option.value = major;
            option.textContent = major;
            if (currentValue === major) option.selected = true;
            majorSelect.appendChild(option);
        });
    }
    
    const serials = [...new Set(studentsData.map(s => s.serial).filter(s => s))].sort();
    const serialSelect = document.getElementById('filterSerial');
    if (serialSelect) {
        const currentValue = serialSelect.value;
        serialSelect.innerHTML = '<option value="">ทั้งหมด</option>';
        serials.forEach(serial => {
            const option = document.createElement('option');
            option.value = serial;
            option.textContent = serial;
            if (currentValue === serial) option.selected = true;
            serialSelect.appendChild(option);
        });
    }
}

// ==================== การแสดงผล ====================

function checkLoginStatus() {
    const role = localStorage.getItem('ltc_user_role');
    const name = localStorage.getItem('ltc_user_name');
    
    if (role === 'admin') {
        currentUserRole = 'admin';
        currentUserName = name || 'Admin';
        document.body.classList.remove('guest-mode');
        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge) {
            roleBadge.innerHTML = '👑 ผู้ดูแลระบบ';
            roleBadge.classList.add('admin');
        }
    } else if (role === 'teacher') {
        currentUserRole = 'teacher';
        currentUserName = name || 'อาจารย์';
        document.body.classList.remove('guest-mode');
        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge) {
            roleBadge.innerHTML = '📚 อาจารย์';
            roleBadge.classList.add('teacher');
        }
    } else {
        currentUserRole = 'guest';
        currentUserName = name || 'ผู้เยี่ยมชม';
        document.body.classList.add('guest-mode');
        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge) {
            roleBadge.innerHTML = '👁️ ผู้เยี่ยมชม';
            roleBadge.classList.add('guest');
        }
    }
    
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = currentUserName;
    }
}

function displayStudentsTable() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    
    const filters = getFilters();
    
    let filteredData = studentsData.filter(student => {
        if (filters.level && student.level !== filters.level) return false;
        if (filters.major && student.major !== filters.major) return false;
        if (filters.serial && student.serial !== filters.serial) return false;
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
            const studentCode = (student.student_code || '').toLowerCase();
            if (!fullName.includes(searchTerm) && !studentCode.includes(searchTerm)) return false;
        }
        return true;
    });
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">📭 ไม่พบข้อมูล</td></tr>';
        return;
    }
    
    let html = '';
    filteredData.forEach((student, index) => {
        const statusClass = student.status === 'กำลังศึกษา' ? 'status-active' : 
                           (student.status === 'จบการศึกษา' ? 'status-graduated' : 'status-inactive');
        const fullName = `${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}`;
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '-';
        
        html += `
            <tr>
                <td><input type="checkbox" class="student-checkbox" data-id="${student.id}"></td>
                <td>${index + 1}</td>
                <td>${student.student_code || ''}</td>
                <td>${fullName}</td>
                <td>${student.level || ''}</td>
                <td>${roomDisplay}</td>
                <td>${student.major || ''}</td>
                <td>${student.serial || ''}</td>
                <td><span class="status-badge ${statusClass}">${student.status || ''}</span></td>
                <td class="admin-only">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="editStudent(${student.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteStudent(${student.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updateStats(filteredData);
}

function updateStats(filteredData) {
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) totalCountEl.textContent = filteredData.length;
    
    const activeCount = studentsData.filter(s => s.status === 'กำลังศึกษา').length;
    const graduatedCount = studentsData.filter(s => s.status === 'จบการศึกษา').length;
    const uniqueMajors = new Set(studentsData.map(s => s.major).filter(m => m));
    
    const activeCountEl = document.getElementById('activeCount');
    if (activeCountEl) activeCountEl.textContent = activeCount;
    
    const graduatedCountEl = document.getElementById('graduatedCount');
    if (graduatedCountEl) graduatedCountEl.textContent = graduatedCount;
    
    const majorCountEl = document.getElementById('majorCount');
    if (majorCountEl) majorCountEl.textContent = uniqueMajors.size;
}

function getFilters() {
    const levelEl = document.getElementById('filterLevel');
    const majorEl = document.getElementById('filterMajor');
    const serialEl = document.getElementById('filterSerial');
    const searchEl = document.getElementById('searchInput');
    
    return {
        level: levelEl?.value || '',
        major: majorEl?.value || '',
        serial: serialEl?.value || '',
        search: searchEl?.value || ''
    };
}

function filterStudents() {
    displayStudentsTable();
}

function resetFilters() {
    const levelSelect = document.getElementById('filterLevel');
    const majorSelect = document.getElementById('filterMajor');
    const serialSelect = document.getElementById('filterSerial');
    const searchInput = document.getElementById('searchInput');
    
    if (levelSelect) levelSelect.value = '';
    if (majorSelect) majorSelect.value = '';
    if (serialSelect) serialSelect.value = '';
    if (searchInput) searchInput.value = '';
    
    displayStudentsTable();
}

// ==================== Dashboard ====================

async function updateDashboard() {
    try {
        const stats = await callAPI('getStatistics', {}, 'GET');
        
        const totalCountEl = document.getElementById('totalCount');
        if (totalCountEl) totalCountEl.textContent = stats.total || 0;
        
        const activeCountEl = document.getElementById('activeCount');
        if (activeCountEl) activeCountEl.textContent = stats.active || 0;
        
        const graduatedCountEl = document.getElementById('graduatedCount');
        if (graduatedCountEl) graduatedCountEl.textContent = stats.graduated || 0;
        
        const majorCountEl = document.getElementById('majorCount');
        if (majorCountEl) {
            const majorCount = Object.keys(stats.byMajor || {}).length;
            majorCountEl.textContent = majorCount;
        }
        
        updateCharts(stats);
        displayRecentStudents();
    } catch (error) {
        console.error('Dashboard error:', error);
    }
}

function updateCharts(stats) {
    const levelCtx = document.getElementById('levelChart')?.getContext('2d');
    if (levelCtx && typeof Chart !== 'undefined') {
        if (levelChart) levelChart.destroy();
        
        const levelLabels = Object.keys(stats.byLevel || {}).filter(l => l !== '2026-05-31T17:00:00.000Z');
        const levelData = levelLabels.map(l => stats.byLevel[l]);
        
        levelChart = new Chart(levelCtx, {
            type: 'pie',
            data: {
                labels: levelLabels,
                datasets: [{
                    data: levelData,
                    backgroundColor: ['#667eea', '#764ba2', '#f56565', '#48bb78', '#ed8936', '#4299e1', '#38b2ac', '#805ad5'],
                    borderWidth: 0
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: true,
                plugins: { 
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} คน` } }
                }
            }
        });
    }
    
    const majorCtx = document.getElementById('majorChart')?.getContext('2d');
    if (majorCtx && typeof Chart !== 'undefined') {
        if (majorChart) majorChart.destroy();
        majorChart = new Chart(majorCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.byMajor || {}),
                datasets: [{
                    label: 'จำนวนนักเรียน',
                    data: Object.values(stats.byMajor || {}),
                    backgroundColor: '#667eea',
                    borderRadius: 8,
                    barPercentage: 0.7
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: true,
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1, precision: 0 },
                        title: { display: true, text: 'จำนวน (คน)' }
                    },
                    x: { title: { display: true, text: 'สาขาวิชา' } }
                }
            }
        });
    }
}

function displayRecentStudents() {
    const tbody = document.getElementById('recentStudentsBody');
    if (!tbody || !studentsData) return;
    
    const recentStudents = [...studentsData].slice(0, 5);
    
    if (recentStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">ไม่มีข้อมูล</td></tr>';
        return;
    }
    
    let html = '';
    recentStudents.forEach(student => {
        const fullName = `${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}`;
        const statusClass = student.status === 'กำลังศึกษา' ? 'status-active' : 
                           (student.status === 'จบการศึกษา' ? 'status-graduated' : 'status-inactive');
        html += `
            <tr>
                <td>${student.student_code || '-'}</td>
                <td>${fullName}</td>
                <td>${student.level || '-'}</td>
                <td>${student.major || '-'}</td>
                <td><span class="status-badge ${statusClass}">${student.status || '-'}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==================== CRUD Operations ====================

async function saveStudent(e) {
    e.preventDefault();
    
    const student = {
        id: document.getElementById('studentId').value,
        student_code: document.getElementById('studentCode').value,
        prefix: document.getElementById('prefix').value,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        level: document.getElementById('level').value,
        room: document.getElementById('room').value,
        major: document.getElementById('major').value,
        serial: document.getElementById('serial').value,
        phone: document.getElementById('phone').value,
        status: document.getElementById('status').value
    };
    
    if (!student.student_code) {
        showNotification('warning', 'กรุณากรอกรหัสนักศึกษา');
        return;
    }
    if (!student.first_name || !student.last_name) {
        showNotification('warning', 'กรุณากรอกชื่อ-นามสกุล');
        return;
    }
    
    try {
        if (student.id) {
            await callAPI('updateStudent', { id: student.id, ...student }, 'POST');
            showNotification('success', 'อัปเดตข้อมูลสำเร็จ');
        } else {
            await callAPI('addStudent', student, 'POST');
            showNotification('success', 'เพิ่มข้อมูลสำเร็จ');
        }
        
        closeModal();
        await loadStudentsData();
    } catch (error) {
        showNotification('error', error.message);
    }
}

async function deleteStudent(id) {
    if (currentUserRole !== 'admin') {
        showNotification('warning', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบข้อมูลได้');
        return;
    }
    
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบข้อมูลนี้ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (result.isConfirmed) {
            try {
                await callAPI('deleteStudent', { id: id }, 'POST');
                showNotification('success', 'ลบข้อมูลสำเร็จ');
                await loadStudentsData();
            } catch (error) {
                showNotification('error', error.message);
            }
        }
    } else {
        if (confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
            try {
                await callAPI('deleteStudent', { id: id }, 'POST');
                showNotification('success', 'ลบข้อมูลสำเร็จ');
                await loadStudentsData();
            } catch (error) {
                showNotification('error', error.message);
            }
        }
    }
}

function editStudent(id) {
    const student = studentsData.find(s => s.id == id);
    if (student) {
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentCode').value = student.student_code || '';
        document.getElementById('prefix').value = student.prefix || 'นาย';
        document.getElementById('firstName').value = student.first_name || '';
        document.getElementById('lastName').value = student.last_name || '';
        document.getElementById('level').value = student.level || 'ปวส.1';
        document.getElementById('room').value = (student.room && !student.room.includes('T')) ? student.room : '';
        document.getElementById('major').value = student.major || 'คอมพิวเตอร์ธุรกิจ';
        document.getElementById('serial').value = student.serial || 'เช้า';
        document.getElementById('phone').value = student.phone || '';
        document.getElementById('status').value = student.status || 'กำลังศึกษา';
        
        document.getElementById('modalTitle').textContent = '✏️ แก้ไขข้อมูลนักศึกษา';
        document.getElementById('studentModal').style.display = 'block';
    }
}

function openStudentModal() {
    if (currentUserRole !== 'admin') {
        showNotification('warning', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มข้อมูลได้');
        return;
    }
    
    const form = document.getElementById('studentForm');
    if (form) form.reset();
    const studentId = document.getElementById('studentId');
    if (studentId) studentId.value = '';
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = '➕ เพิ่มข้อมูลนักศึกษา';
    const modal = document.getElementById('studentModal');
    if (modal) modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    if (modal) modal.style.display = 'none';
}

// ==================== Export Functions ====================

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        showNotification('error', 'ไม่พบไลบรารี XLSX กรุณาตรวจสอบการโหลด script');
        return;
    }
    
    const filters = getFilters();
    let exportData = studentsData.filter(student => {
        if (filters.level && student.level !== filters.level) return false;
        if (filters.major && student.major !== filters.major) return false;
        if (filters.serial && student.serial !== filters.serial) return false;
        return true;
    });
    
    const worksheetData = exportData.map((s, idx) => ({
        'ลำดับ': idx + 1,
        'รหัสนักศึกษา': s.student_code,
        'คำนำหน้า': s.prefix,
        'ชื่อ': s.first_name,
        'นามสกุล': s.last_name,
        'ระดับชั้น': s.level,
        'ห้อง': (s.room && !s.room.includes('T')) ? s.room : '',
        'สาขาวิชา': s.major,
        'รอบเรียน': s.serial,
        'เบอร์โทร': s.phone,
        'สถานะ': s.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Data');
    XLSX.writeFile(wb, `students_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('success', 'ส่งออกข้อมูลเรียบร้อย');
}

function printWithSignatures() {
    const filters = getFilters();
    const termVal = document.getElementById('printTerm')?.value || 'ประจำภาคเรียนที่ 1 ปีการศึกษา 2567';
    let printData = studentsData.filter(student => {
        if (filters.level && student.level !== filters.level) return false;
        if (filters.major && student.major !== filters.major) return false;
        if (filters.serial && student.serial !== filters.serial) return false;
        return true;
    });
    
    if (printData.length === 0) {
        showNotification('warning', 'ไม่มีข้อมูลที่จะพิมพ์');
        return;
    }
    
    let html = '<table style="width:100%; border-collapse: collapse; table-layout: fixed;">';
    html += '<thead><tr>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:3.0%; height:28px; text-align:center;">ลำดับ</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:8.5%; text-align:center;">รหัสนักศึกษา</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:14.5%; text-align:left; padding-left:5px;">ชื่อ-สกุล</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:5.5%; text-align:center;">ระดับชั้น</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:4.0%; text-align:center;">ห้อง</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:11.5%; text-align:left; padding-left:5px;">สาขาวิชา</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:4.5%; text-align:center;">รอบ</th>';
    
    for (let i = 1; i <= 25; i++) {
        html += `<th style="border:1px solid #000; font-size:8px; font-weight:bold; width:1.94%; text-align:center;">&nbsp;</th>`;
    }
    
    html += '</tr></thead><tbody>';
    
    printData.forEach((student, index) => {
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '';
        html += `<tr style="height: 28px;">
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${index + 1}</td>
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${student.student_code || ''}</td>
            <td style="border:1px solid #000; text-align:left; font-size:12px; padding-left:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}</td>
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${student.level || ''}</td>
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${roomDisplay}</td>
            <td style="border:1px solid #000; text-align:left; font-size:12px; padding-left:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${student.major || ''}</td>
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${student.serial || ''}</td>`;
        
        for (let i = 1; i <= 25; i++) {
            html += `<td style="border:1px solid #000; text-align:center;">&nbsp;</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>รายชื่อนักศึกษา - LTC</title>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: A4 landscape;
                    margin: 8mm 8mm 8mm 8mm;
                }
                body { 
                    font-family: 'Sarabun', sans-serif; 
                    margin: 0; 
                    padding: 0;
                    color: #000;
                    background: #fff;
                }
                .header-container {
                    text-align: center;
                    margin-bottom: 5px;
                }
                .college-en {
                    font-size: 12px;
                    font-weight: 700;
                    color: #c5a059;
                    margin: 0 0 2px 0;
                    letter-spacing: 0.5px;
                    font-family: 'Arial', sans-serif;
                }
                .college-th {
                    font-size: 18px;
                    font-weight: 700;
                    color: #002060;
                    margin: 0 0 4px 0;
                }
                .title-report {
                    font-size: 16px;
                    font-weight: 700;
                    color: #000;
                    margin: 0 0 3px 0;
                }
                .subtitle-report {
                    font-size: 12px;
                    color: #000;
                    margin: 0 0 5px 0;
                }
                .meta-container {
                    font-size: 12px;
                    margin-top: 5px;
                    margin-bottom: 5px;
                    text-align: center;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px;
                }
                th, td { 
                    border: 1px solid #000; 
                    font-weight: normal;
                }
                th { 
                    font-weight: bold; 
                    background: #fff;
                }
                @media print { 
                    body { margin: 0; } 
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <p class="college-en">LAEMTHONG TECHNOLOGY COLLEGE</p>
                <h2 class="college-th">วิทยาลัยเทคโนโลยีแหลมทอง</h2>
                <h3 class="title-report">รายชื่อนักศึกษา</h3>
                <p class="subtitle-report">${termVal}</p>
            </div>
            
            <hr style="border: 0.5px solid #000; margin: 5px 0 5px 0;">
            
            <div class="meta-container">
                ระดับชั้น: ${filters.level || 'ทั้งหมด'} &nbsp;|&nbsp; 
                สาขาวิชา: ${filters.major || 'ทั้งหมด'} &nbsp;|&nbsp; 
                รอบเรียน: ${filters.serial || 'ทั้งหมด'} &nbsp;|&nbsp; 
                จำนวนนักศึกษา: ${printData.length} คน
            </div>
            
            ${html}
            
            <hr style="border: 0.5px solid #000; margin: 10px 0 10px 0;">
            
            <table style="width: 100%; border: none; margin-top: 15px; border-collapse: collapse;">
                <tr style="height: auto;">
                    <td style="border: none; text-align: center; font-size: 12px; width: 33.3%;">
                        (......................................................)<br>
                        <span style="display: inline-block; margin-top: 5px;">ครูที่ปรึกษา</span>
                    </td>
                    <td style="border: none; text-align: center; font-size: 12px; width: 33.3%;">
                        (......................................................)<br>
                        <span style="display: inline-block; margin-top: 5px;">หัวหน้าแผนก</span>
                    </td>
                    <td style="border: none; text-align: center; font-size: 12px; width: 33.3%;">
                        (......................................................)<br>
                        <span style="display: inline-block; margin-top: 5px;">ผู้บริหารสถานศึกษา</span>
                    </td>
                </tr>
            </table>
            
            <div style="text-align: right; font-size: 7px; margin-top: 15px; padding-right: 5px; color: #000;">
                วันที่พิมพ์: ${formattedDate}
            </div>
            
            <script>
                window.onload = function() { 
                    setTimeout(() => { window.print(); }, 500);
                    setTimeout(() => { window.close(); }, 1000);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function importExcelFile() {
    if (currentUserRole !== 'admin') {
        showNotification('warning', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถนำเข้าข้อมูลได้');
        return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv, .xlsm';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(loadEvent) {
            try {
                showNotification('info', 'กำลังนำเข้าข้อมูล... กรุณารอสักครู่');
                const data = new Uint8Array(loadEvent.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet);
                
                if (rows.length === 0) {
                    showNotification('warning', 'ไม่พบข้อมูลในไฟล์');
                    return;
                }
                
                const newStudents = rows.map((row) => ({
                    student_code: String(row['รหัสนักศึกษา'] || row['code'] || row['รหัส'] || ''),
                    prefix: row['คำนำหน้า'] || row['prefix'] || 'นาย',
                    first_name: row['ชื่อ'] || row['firstName'] || row['first_name'] || '',
                    last_name: row['นามสกุล'] || row['lastName'] || row['last_name'] || '',
                    level: row['ระดับชั้น'] || row['level'] || 'ปวส.1',
                    room: row['ห้อง'] || row['room'] || '',
                    major: row['สาขาวิชา'] || row['major'] || 'คอมพิวเตอร์ธุรกิจ',
                    serial: row['รอบเรียน'] || row['serial'] || 'เช้า',
                    phone: String(row['เบอร์โทร'] || row['phone'] || row['เบอร์โทรศัพท์'] || ''),
                    status: row['สถานะ'] || row['status'] || 'กำลังศึกษา'
                })).filter(s => s.student_code);
                
                const result = await callAPI('importStudents', { students: newStudents }, 'POST');
                showNotification('success', `นำเข้าข้อมูลสำเร็จ ${result.imported || newStudents.length} รายการ`);
                await loadStudentsData();
                
            } catch (error) {
                console.error('Import error:', error);
                showNotification('error', 'นำเข้าข้อมูลล้มเหลว: ' + error.message);
            }
        };
        
        reader.readAsArrayBuffer(file);
    };
    
    input.click();
}

// ==================== Room Options Helper ====================

function updateRoomOptions(levelVal, roomSelectId, defaultLabel) {
    const roomSelect = document.getElementById(roomSelectId);
    if (!roomSelect) return;

    // กำหนดห้องตามระดับชั้น
    const pvchRooms = ['1/1', '2/1', '3/1'];
    const pvsRooms  = ['1/1', '1/6', '2/1', '2/6'];

    let rooms = [];
    if (levelVal.startsWith('ปวช')) {
        rooms = pvchRooms;
    } else if (levelVal.startsWith('ปวส')) {
        rooms = pvsRooms;
    }

    roomSelect.innerHTML = `<option value="">${defaultLabel}</option>`;
    rooms.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = `ห้อง ${r}`;
        roomSelect.appendChild(opt);
    });
}

// ==================== Attendance Functions ====================

async function generateAttendanceTable() {
    const level = document.getElementById('attendanceLevel')?.value;
    const room = document.getElementById('attendanceRoom')?.value;
    const major = document.getElementById('attendanceMajor')?.value;
    const serial = document.getElementById('attendanceSerial')?.value;
    const termVal = document.getElementById('attendanceTerm')?.value || 'ประจำภาคเรียนที่ 1 ปีการศึกษา 2567';
    
    if (!level) {
        showNotification('warning', 'กรุณาเลือกระดับชั้น');
        return;
    }
    
    let filteredData = studentsData.filter(s => s.level === level);
    if (room && room !== '') {
        filteredData = filteredData.filter(s => {
            const roomDisplay = (s.room && !String(s.room).includes('T')) ? String(s.room).trim() : '';
            return roomDisplay === room;
        });
    }
    if (major && major !== '') {
        filteredData = filteredData.filter(s => s.major === major);
    }
    if (serial && serial !== '') {
        filteredData = filteredData.filter(s => s.serial === serial);
    }
    
    if (filteredData.length === 0) {
        const container = document.getElementById('attendanceTableContainer');
        if (container) container.innerHTML = '<div class="loading">📭 ไม่พบข้อมูลนักศึกษาในระดับชั้นนี้</div>';
        return;
    }
    
    let html = '<div id="attendancePrintTable">';
    html += `
        <div class="header-container" style="text-align: center; margin-bottom: 5px;">
            <p class="college-en" style="font-size: 12px; font-weight: 700; color: #c5a059; margin: 0 0 2px 0; letter-spacing: 0.5px; font-family: 'Arial', sans-serif;">LAEMTHONG TECHNOLOGY COLLEGE</p>
            <h2 class="college-th" style="font-size: 18px; font-weight: 700; color: #002060; margin: 0 0 4px 0;">วิทยาลัยเทคโนโลยีแหลมทอง</h2>
            <h3 class="title-report" style="font-size: 16px; font-weight: 700; color: #000; margin: 0 0 3px 0;">ใบเช็คชื่อนักศึกษา</h3>
            <p class="subtitle-report" style="font-size: 12px; color: #000; margin: 0 0 5px 0;">${termVal}</p>
        </div>
        
        <hr style="border: 0.5px solid #000; margin: 5px 0 5px 0;">
        
        <div class="meta-container" style="font-size: 12px; margin-top: 5px; margin-bottom: 5px; text-align: center;">
            ระดับชั้น: ${level} &nbsp;|&nbsp; สาขาวิชา: ${major || 'ทั้งหมด'} &nbsp;|&nbsp; รอบเรียน: ${serial || 'ทั้งหมด'} &nbsp;|&nbsp; จำนวนนักศึกษา: ${filteredData.length} คน
        </div>
    `;
    
    html += '<table class="attendance-table" style="width:100%; border-collapse: collapse; table-layout: fixed;">';
    html += '<thead><tr>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:3.5%; height:28px; text-align:center;">ลำดับ</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:9.0%; text-align:center;">รหัสนักศึกษา</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:16.0%; text-align:left; padding-left:5px;">ชื่อ-สกุล</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:6.0%; text-align:center;">ระดับชั้น</th>';
    html += '<th style="border:1px solid #000; font-size:12px; font-weight:bold; width:15.0%; text-align:left; padding-left:5px;">สาขาวิชา</th>';
    
    for (let i = 1; i <= 25; i++) {
        html += `<th style="border:1px solid #000; font-size:8px; font-weight:bold; width:2.02%; text-align:center;">&nbsp;</th>`;
    }
    
    html += '</tr></thead><tbody>';
    
    filteredData.forEach((student, index) => {
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '';
        html += `<tr style="height: 28px;">
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${index + 1}</td>
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${student.student_code || ''}</td>
            <td style="border:1px solid #000; text-align:left; font-size:12px; padding-left:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}</td>
            <td style="border:1px solid #000; text-align:center; font-size:12px;">${student.level || ''}</td>
            <td style="border:1px solid #000; text-align:left; font-size:12px; padding-left:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${student.major || ''} ${roomDisplay}</td>`;
        
        for (let i = 1; i <= 25; i++) {
            html += `<td style="border:1px solid #000; text-align:center;">&nbsp;</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    html += '<hr style="border: 0.5px solid #000; margin: 10px 0 10px 0;">';
    html += `
        <table style="width: 100%; border: none; margin-top: 15px; border-collapse: collapse;">
            <tr style="height: auto;">
                <td style="border: none; text-align: center; font-size: 12px; width: 33.3%;">
                    (......................................................)<br>
                    <span style="display: inline-block; margin-top: 5px;">ครูที่ปรึกษา</span>
                </td>
                <td style="border: none; text-align: center; font-size: 12px; width: 33.3%;">
                    (......................................................)<br>
                    <span style="display: inline-block; margin-top: 5px;">หัวหน้าแผนก</span>
                </td>
                <td style="border: none; text-align: center; font-size: 12px; width: 33.3%;">
                    (......................................................)<br>
                    <span style="display: inline-block; margin-top: 5px;">ผู้บริหารสถานศึกษา</span>
                </td>
            </tr>
        </table>
    `;
    
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    html += `
        <div style="text-align: right; font-size: 7px; margin-top: 15px; padding-right: 5px; color: #000;">
            วันที่พิมพ์: ${formattedDate}
        </div>
    `;
    html += '</div>';
    
    const container = document.getElementById('attendanceTableContainer');
    if (container) container.innerHTML = html;
}

function printAttendance() {
    const printContent = document.getElementById('attendancePrintTable');
    if (!printContent) {
        showNotification('warning', 'กรุณาสร้างใบเช็คชื่อก่อนพิมพ์');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ใบเช็คชื่อนักศึกษา - LTC</title>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                @page {
                    size: A4 landscape;
                    margin: 8mm 8mm 8mm 8mm;
                }
                body { 
                    font-family: 'Sarabun', sans-serif; 
                    margin: 0; 
                    padding: 0;
                    color: #000;
                    background: #fff;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px;
                    table-layout: fixed;
                }
                th, td { 
                    border: 1px solid #000; 
                    font-weight: normal;
                    padding: 4px;
                }
                th { 
                    font-weight: bold; 
                    background: #fff;
                }
                @media print { 
                    body { margin: 0; } 
                }
            </style>
        </head>
        <body>
            ${printContent.innerHTML}
            <script>
                window.onload = function() { 
                    setTimeout(() => { window.print(); }, 500);
                    setTimeout(() => { window.close(); }, 1000);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ==================== Report Functions ====================

async function generateReport() {
    const level = document.getElementById('reportLevel')?.value;
    const room = document.getElementById('reportRoom')?.value;
    const major = document.getElementById('reportMajor')?.value;
    const serial = document.getElementById('reportSerial')?.value;
    
    let reportData = studentsData;
    if (level && level !== '') reportData = reportData.filter(s => s.level === level);
    if (room && room !== '') {
        reportData = reportData.filter(s => {
            const roomDisplay = (s.room && !String(s.room).includes('T')) ? String(s.room).trim() : '';
            return roomDisplay === room;
        });
    }
    if (major && major !== '') reportData = reportData.filter(s => s.major === major);
    if (serial && serial !== '') reportData = reportData.filter(s => s.serial === serial);
    
    const levelStats = {};
    const majorStats = {};
    const serialStats = {};
    const statusStats = { 'กำลังศึกษา': 0, 'พักการเรียน': 0, 'ลาออก': 0, 'จบการศึกษา': 0 };
    
    reportData.forEach(s => {
        if (s.level && s.level !== '2026-05-31T17:00:00.000Z') levelStats[s.level] = (levelStats[s.level] || 0) + 1;
        if (s.major) majorStats[s.major] = (majorStats[s.major] || 0) + 1;
        if (s.serial) serialStats[s.serial] = (serialStats[s.serial] || 0) + 1;
        if (s.status) statusStats[s.status] = (statusStats[s.status] || 0) + 1;
    });
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h3>📊 สรุปข้อมูลนักศึกษา</h3>
            <p><strong>เงื่อนไข:</strong> ${level ? 'ระดับชั้น ' + level : 'ทุกระดับชั้น'} ${major ? ' | สาขา ' + major : ''} ${serial ? ' | รอบเรียน ' + serial : ''}</p>
            <p><strong>จำนวนนักเรียนทั้งหมด:</strong> ${reportData.length} คน</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>📚 จำแนกตามระดับชั้น</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(levelStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>🏢 จำแนกตามสาขาวิชา</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(majorStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>✅ จำแนกตามสถานะ</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(statusStats).filter(([_,v]) => v > 0).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>🕒 จำแนกตามรอบเรียน</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(serialStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                </table>
            </div>
        </div>
    `;
    
    const reportResult = document.getElementById('reportResult');
    if (reportResult) reportResult.innerHTML = html;
}

function exportReportToExcel() {
    if (typeof XLSX === 'undefined') {
        showNotification('error', 'ไม่พบไลบรารี XLSX');
        return;
    }
    
    const level = document.getElementById('reportLevel')?.value;
    const major = document.getElementById('reportMajor')?.value;
    const serial = document.getElementById('reportSerial')?.value;
    
    let reportData = studentsData;
    if (level && level !== '') reportData = reportData.filter(s => s.level === level);
    if (major && major !== '') reportData = reportData.filter(s => s.major === major);
    if (serial && serial !== '') reportData = reportData.filter(s => s.serial === serial);
    
    const worksheetData = reportData.map((s, idx) => ({
        'ลำดับ': idx + 1,
        'รหัสนักศึกษา': s.student_code,
        'ชื่อ-สกุล': `${s.prefix || ''}${s.first_name || ''} ${s.last_name || ''}`,
        'ระดับชั้น': s.level,
        'สาขาวิชา': s.major,
        'รอบเรียน': s.serial,
        'สถานะ': s.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Report');
    XLSX.writeFile(wb, `report_${level || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('success', 'ส่งออกรายงานเรียบร้อย');
}

// ==================== Authentication ====================

function logout() {
    localStorage.removeItem('ltc_user_role');
    localStorage.removeItem('ltc_user_name');
    window.location.href = 'login.html';
}

// ==================== switchPage ====================

function switchPage(page) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    
    if (page === 'dashboard') {
        const dashboardPage = document.getElementById('dashboardPage');
        if (dashboardPage) dashboardPage.classList.add('active');
        updateDashboard();
    } else if (page === 'students') {
        const studentsPage = document.getElementById('studentsPage');
        if (studentsPage) studentsPage.classList.add('active');
        displayStudentsTable();
    } else if (page === 'attendance') {
        const attendancePage = document.getElementById('attendancePage');
        if (attendancePage) attendancePage.classList.add('active');
    } else if (page === 'reports') {
        const reportsPage = document.getElementById('reportsPage');
        if (reportsPage) reportsPage.classList.add('active');
        generateReport();
    }
}

// ==================== Event Listeners ====================

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const page = this.dataset.page;
            if (!page) {
                // หากไม่มี data-page ปล่อยให้ลิงก์ทำงานทำงานปกติ (เช่น ลิงก์ภายนอก)
                return;
            }
            e.preventDefault();
            switchPage(page);
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' && themeToggle) {
        themeToggle.checked = true;
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    const logoutSidebar = document.getElementById('logoutSidebar');
    if (logoutSidebar) logoutSidebar.addEventListener('click', logout);
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', filterStudents);
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadStudentsData());
    
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.addEventListener('click', openStudentModal);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.addEventListener('click', printWithSignatures);
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', importExcelFile);
    
    const genAttendanceBtn = document.getElementById('generateAttendanceBtn');
    if (genAttendanceBtn) genAttendanceBtn.addEventListener('click', generateAttendanceTable);
    const printAttendanceBtn = document.getElementById('printAttendanceBtn');
    if (printAttendanceBtn) printAttendanceBtn.addEventListener('click', printAttendance);

    // อัปเดตห้อง dropdown เมื่อเปลี่ยนระดับชั้น (ใบเช็คชื่อ)
    const attendanceLevelEl = document.getElementById('attendanceLevel');
    if (attendanceLevelEl) {
        attendanceLevelEl.addEventListener('change', function() {
            updateRoomOptions(this.value, 'attendanceRoom', 'เลือกห้อง');
        });
    }

    // อัปเดตห้อง dropdown เมื่อเปลี่ยนระดับชั้น (รายงาน)
    const reportLevelEl = document.getElementById('reportLevel');
    if (reportLevelEl) {
        reportLevelEl.addEventListener('change', function() {
            updateRoomOptions(this.value, 'reportRoom', 'ทุกห้อง');
        });
    }
    
    const genReportBtn = document.getElementById('generateReportBtn');
    if (genReportBtn) genReportBtn.addEventListener('click', generateReport);
    const exportReportBtn = document.getElementById('exportReportExcelBtn');
    if (exportReportBtn) exportReportBtn.addEventListener('click', exportReportToExcel);
    
    const studentForm = document.getElementById('studentForm');
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const cancelBtn = document.querySelector('.cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    const modal = document.getElementById('studentModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }
    
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#studentTableBody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') filterStudents();
        });
    }
}

// ==================== Initialize ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 LTC Student Management System Starting...');
    checkLoginStatus();
    setupEventListeners();
    
    if (!window.location.pathname.includes('login.html')) {
        await loadStudentsData();
        setTimeout(() => {
            testAPIConnection();
        }, 1000);
    }
});
