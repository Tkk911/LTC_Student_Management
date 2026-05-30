// ============================================================================
// LTC Student Management System - Frontend Script (Full Version)
// Version: 6.1 - Fixed & Production Ready
// เชื่อมต่อกับ Google Apps Script Backend
// ============================================================================

// ==================== CONFIGURATION ====================
// 🔴 IMPORTANT: ใส่ URL ที่ได้จากการ Deploy GAS ตรงนี้!!!
const GAS_URL = '// ============================================================================
// LTC Student Management System - Frontend Script (Full Version)
// Version: 6.1 - Fixed & Production Ready
// เชื่อมต่อกับ Google Apps Script Backend
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

// ==================== ฟังก์ชันเรียก API ====================

/**
 * เรียก API ของ Google Apps Script
 * @param {string} action - ชื่อ action ที่ต้องการเรียก
 * @param {object} data - ข้อมูลที่ส่งไป (สำหรับ POST)
 * @param {string} method - GET หรือ POST
 * @returns {Promise} - ผลลัพธ์จาก API
 */
async function callAPI(action, data = {}, method = 'GET') {
    try {
        let url = `${GAS_URL}?action=${action}`;
        
        // ถ้าเป็น GET ให้เพิ่ม parameter ใน URL
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
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        // ถ้าเป็น POST ให้ใส่ body
        if (method === 'POST') {
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

/**
 * ทดสอบการเชื่อมต่อ API
 */
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

/**
 * โหลดข้อมูลนักเรียนทั้งหมดจาก GAS
 */
async function loadStudentsData() {
    try {
        showLoading(true);
        studentsData = await callAPI('getStudents', {}, 'GET');
        
        // แก้ไขข้อมูล room ที่เป็นวันที่ผิดพลาด
        studentsData = studentsData.map(student => {
            if (student.room && typeof student.room === 'string' && student.room.includes('T')) {
                student.room = '';
            }
            // แก้ไข student_code ให้เป็น string
            if (student.student_code) {
                student.student_code = String(student.student_code);
            }
            // แก้ไข phone ให้เป็น string
            if (student.phone) {
                student.phone = String(student.phone);
            }
            return student;
        });
        
        console.log('Loaded students:', studentsData.length, 'records');
        displayStudentsTable();
        updateDashboard();
        updateFilters();
        showLoading(false);
        return studentsData;
    } catch (error) {
        showLoading(false);
        console.error('Load data error:', error);
        showNotification('error', 'ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ');
        
        // แสดงข้อความแจ้งเตือนให้ตั้งค่า URL
        if (GAS_URL === 'https://script.google.com/macros/s/AKfycbzaAfeFT1di1iOTcx8_PF7iwHMXT8ly40oM0PDLHM0rnc3LMeFs72KAhxqTiH-vSz5egQ/exec') {
            document.getElementById('studentTableBody').innerHTML = 
                '<tr><td colspan="10" class="loading">⚠️ กรุณาตั้งค่า GAS_URL ในไฟล์ script.js ให้ถูกต้อง<br>หลังจาก Deploy GAS แล้ว ให้คัดลอก URL มาใส่ใน const GAS_URL</td></tr>';
        }
        return [];
    }
}

/**
 * โหลดข้อมูลตามตัวกรอง
 */
async function loadFilteredStudents() {
    try {
        const filters = getFilters();
        const filteredData = await callAPI('getFilteredStudents', filters, 'GET');
        studentsData = filteredData;
        displayStudentsTable();
        updateDashboard();
    } catch (error) {
        console.error('Filter error:', error);
    }
}

/**
 * แสดง/ซ่อน loading
 */
function showLoading(show) {
    const tbody = document.getElementById('studentTableBody');
    if (show && tbody && (!studentsData || studentsData.length === 0)) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
    }
}

/**
 * อัปเดตตัวเลือกใน filter dropdown
 */
function updateFilters() {
    if (!studentsData || studentsData.length === 0) return;
    
    // อัปเดตระดับชั้น
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
    
    // อัปเดตสาขาวิชา
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
    
    // อัปเดตรอบเรียน
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
    
    // อัปเดตสถิติรวม (ไม่ใช้ filter)
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
    // อัปเดตกราฟระดับชั้น
    const levelCtx = document.getElementById('levelChart')?.getContext('2d');
    if (levelCtx) {
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
    
    // อัปเดตกราฟสาขาวิชา
    const majorCtx = document.getElementById('majorChart')?.getContext('2d');
    if (majorCtx) {
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
                },
                plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw} คน` } } }
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
    
    // ตรวจสอบข้อมูลที่จำเป็น
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
    
    let html = '<table style="width:100%; border-collapse: collapse; font-size: 10px;">';
    html += '<thead><tr style="background:#f0f0f0;">';
    html += '<th style="border:1px solid #000; padding:5px;">#</th>';
    html += '<th style="border:1px solid #000; padding:5px;">รหัสนักศึกษา</th>';
    html += '<th style="border:1px solid #000; padding:5px;">ชื่อ-สกุล</th>';
    html += '<th style="border:1px solid #000; padding:5px;">ระดับชั้น</th>';
    html += '<th style="border:1px solid #000; padding:5px;">สาขาวิชา</th>';
    
    for (let i = 1; i <= 25; i++) {
        html += `<th style="border:1px solid #000; padding:5px; width:30px">รอบ ${i}</th>`;
    }
    
    html += '</tr></thead><tbody>';
    
    printData.forEach((student, index) => {
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '';
        html += `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${index + 1}</td>
            <td style="border:1px solid #000; padding:5px;">${student.student_code || ''}</td>
            <td style="border:1px solid #000; padding:5px;">${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${student.level || ''}</td>
            <td style="border:1px solid #000; padding:5px;">${student.major || ''} ${roomDisplay}</td>`;
        
        for (let i = 1; i <= 25; i++) {
            html += `<td style="border:1px solid #000; width:30px; text-align:center;">&nbsp;</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>รายชื่อนักศึกษา - LTC</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Sarabun', sans-serif; margin: 20px; }
                h2, h3 { text-align: center; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
                th { background: #f0f0f0; font-weight: bold; }
                .signature-line { margin-top: 30px; text-align: right; }
                @media print {
                    body { margin: 0; padding: 10px; }
                }
            </style>
        </head>
        <body>
            <h2>สถาบันเทคโนโลยีลาดกระบัง วิทยาเขตแหลมทอง</h2>
            <h3>รายชื่อนักศึกษา ${filters.level || 'ทุกระดับชั้น'} ${filters.major ? 'สาขา ' + filters.major : ''}</h3>
            <p style="text-align:center;">(พร้อมช่องเซ็นชื่อ 25 ครั้ง)</p>
            ${html}
            <div class="signature-line">
                ลงชื่อ......................................................ผู้บันทึก<br>
                (......................................................)<br>
                วันที่.........../.........../...........
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

// ==================== Import Excel ====================

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
                showNotification('success', `นำเข้าข้อมูลสำเร็จ ${result.imported || newStudents.length} รายการ${result.failed ? ` (ล้มเหลว ${result.failed} รายการ)` : ''}`);
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

// ==================== Attendance Functions ====================

async function generateAttendanceTable() {
    const level = document.getElementById('attendanceLevel')?.value;
    const major = document.getElementById('attendanceMajor')?.value;
    
    if (!level) {
        showNotification('warning', 'กรุณาเลือกระดับชั้น');
        return;
    }
    
    let filteredData = studentsData.filter(s => s.level === level);
    if (major && major !== '') {
        filteredData = filteredData.filter(s => s.major === major);
    }
    
    if (filteredData.length === 0) {
        const container = document.getElementById('attendanceTableContainer');
        if (container) container.innerHTML = '<div class="loading">📭 ไม่พบข้อมูลนักศึกษาในระดับชั้นนี้</div>';
        return;
    }
    
    let html = '<div id="attendancePrintTable">';
    html += '<h3 style="text-align:center;">ใบเช็คชื่อนักศึกษา</h3>';
    html += `<h4 style="text-align:center;">ระดับชั้น: ${level} ${major ? ' | สาขา: ' + major : ''}</h4>`;
    html += '<table class="attendance-table" style="width:100%; border-collapse: collapse;">';
    html += '<thead><tr style="background:#f0f0f0;">';
    html += '<th style="border:1px solid #000; padding:6px;">ลำดับ</th>';
    html += '<th style="border:1px solid #000; padding:6px;">รหัสนักศึกษา</th>';
    html += '<th style="border:1px solid #000; padding:6px;">ชื่อ-สกุล</th>';
    html += '<th style="border:1px solid #000; padding:6px;">ระดับชั้น</th>';
    html += '<th style="border:1px solid #000; padding:6px;">สาขาวิชา</th>';
    
    for (let i = 1; i <= 25; i++) {
        html += `<th style="border:1px solid #000; padding:6px; width:35px;">รอบ ${i}</th>`;
    }
    
    html += '</tr></thead><tbody>';
    
    filteredData.forEach((student, index) => {
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '';
        html += `<tr>
            <td style="border:1px solid #000; padding:6px; text-align:center;">${index + 1}</td>
            <td style="border:1px solid #000; padding:6px;">${student.student_code || ''}</td>
            <td style="border:1px solid #000; padding:6px;">${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}</td>
            <td style="border:1px solid #000; padding:6px; text-align:center;">${student.level || ''}</td>
            <td style="border:1px solid #000; padding:6px;">${student.major || ''} ${roomDisplay}</td>`;
        
        for (let i = 1; i <= 25; i++) {
            html += `<td style="border:1px solid #000; width:35px; text-align:center;">&nbsp;</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    html += '<div style="margin-top: 30px; text-align: right;">ลงชื่อ...............................................ผู้บันทึก<br>(......................................................)<br>วันที่.........../.........../...........</div>';
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
            <style>
                body { font-family: 'Sarabun', sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
                th { background: #f0f0f0; font-weight: bold; }
                @media print {
                    body { margin: 0; padding: 10px; }
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
    const major = document.getElementById('reportMajor')?.value;
    
    let reportData = studentsData;
    if (level && level !== '') reportData = reportData.filter(s => s.level === level);
    if (major && major !== '') reportData = reportData.filter(s => s.major === major);
    
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
            <p><strong>เงื่อนไข:</strong> ${level ? 'ระดับชั้น ' + level : 'ทุกระดับชั้น'} ${major ? ' | สาขา ' + major : ''}</p>
            <p><strong>จำนวนนักเรียนทั้งหมด:</strong> ${reportData.length} คน</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>📚 จำแนกตามระดับชั้น</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(levelStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                    ${Object.keys(levelStats).length === 0 ? '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>' : ''}
                    <tr style="border-top:2px solid #ddd"><td><strong>รวม</strong></td><td><strong>${reportData.length} คน</strong></td></tr>
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>🏢 จำแนกตามสาขาวิชา</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(majorStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                    ${Object.keys(majorStats).length === 0 ? '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>' : ''}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>🕐 จำแนกตามรอบเรียน</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(serialStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                    ${Object.keys(serialStats).length === 0 ? '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>' : ''}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>✅ จำแนกตามสถานะ</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(statusStats).filter(([_,v]) => v > 0).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                </table>
            </div>
        </div>
    `;
    
    html += `
        <div style="margin-top: 30px;">
            <h4>📋 รายชื่อนักศึกษา</h4>
            <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="border:1px solid #ddd; padding:8px;">#</th>
                        <th style="border:1px solid #ddd; padding:8px;">รหัสนักศึกษา</th>
                        <th style="border:1px solid #ddd; padding:8px;">ชื่อ-สกุล</th>
                        <th style="border:1px solid #ddd; padding:8px;">ระดับชั้น</th>
                        <th style="border:1px solid #ddd; padding:8px;">สาขาวิชา</th>
                        <th style="border:1px solid #ddd; padding:8px;">รอบเรียน</th>
                        <th style="border:1px solid #ddd; padding:8px;">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map((s, idx) => {
                        const roomDisplay = (s.room && !s.room.includes('T')) ? s.room : '';
                        return `
                        <tr>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx + 1}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${s.student_code || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${s.prefix || ''}${s.first_name || ''} ${s.last_name || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${s.level || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${s.major || ''} ${roomDisplay}</td>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${s.serial || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${s.status || ''}</td>
                        </tr>
                    `}).join('')}
                    ${reportData.length === 0 ? '<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูล</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
    
    const reportResult = document.getElementById('reportResult');
    if (reportResult) reportResult.innerHTML = html;
}

function exportReportToExcel() {
    const level = document.getElementById('reportLevel')?.value;
    const major = document.getElementById('reportMajor')?.value;
    
    let reportData = studentsData;
    if (level && level !== '') reportData = reportData.filter(s => s.level === level);
    if (major && major !== '') reportData = reportData.filter(s => s.major === major);
    
    const worksheetData = reportData.map((s, idx) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Report');
    XLSX.writeFile(wb, `report_${level || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showNotification('success', 'ส่งออกรายงานเรียบร้อย');
}

// ==================== Notification ====================

function showNotification(type, message) {
    Swal.fire({
        icon: type,
        title: type === 'success' ? 'สำเร็จ' : (type === 'error' ? 'ผิดพลาด' : (type === 'warning' ? 'คำเตือน' : 'แจ้งเตือน')),
        text: message,
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
    }).catch(() => {});
}

// ==================== Authentication ====================

async function login() {
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (!username || !password) {
        if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.innerHTML = '❌ กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        }
        return;
    }
    
    try {
        const result = await callAPI('authenticate', { username, password }, 'POST');
        
        if (result && result.success) {
            localStorage.setItem('ltc_user_role', result.user.role);
            localStorage.setItem('ltc_user_name', result.user.fullname);
            window.location.href = 'index.html';
        } else {
            if (errorMsg) {
                errorMsg.style.display = 'block';
                errorMsg.innerHTML = `❌ ${result?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'}`;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.innerHTML = '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
        }
    }
}

function guestLogin() {
    localStorage.setItem('ltc_user_role', 'guest');
    localStorage.setItem('ltc_user_name', 'ผู้เยี่ยมชม');
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('ltc_user_role');
    localStorage.removeItem('ltc_user_name');
    window.location.href = 'login.html';
}

// ==================== Event Listeners ====================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            switchPage(page);
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }
    
    // Mobile sidebar
    if (window.innerWidth <= 768) {
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('mobile-open');
            });
        }
    }
    
    // Theme toggle
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
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' && themeToggle) {
        themeToggle.checked = true;
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Logout
    const logoutSidebar = document.getElementById('logoutSidebar');
    if (logoutSidebar) logoutSidebar.addEventListener('click', logout);
    
    // Search and filter
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', filterStudents);
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadStudentsData());
    
    // Action buttons
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.addEventListener('click', openStudentModal);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.addEventListener('click', printWithSignatures);
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', importExcelFile);
    
    // Attendance
    const genAttendanceBtn = document.getElementById('generateAttendanceBtn');
    if (genAttendanceBtn) genAttendanceBtn.addEventListener('click', generateAttendanceTable);
    const printAttendanceBtn = document.getElementById('printAttendanceBtn');
    if (printAttendanceBtn) printAttendanceBtn.addEventListener('click', printAttendance);
    
    // Report
    const genReportBtn = document.getElementById('generateReportBtn');
    if (genReportBtn) genReportBtn.addEventListener('click', generateReport);
    const exportReportBtn = document.getElementById('exportReportExcelBtn');
    if (exportReportBtn) exportReportBtn.addEventListener('click', exportReportToExcel);
    
    // Student form
    const studentForm = document.getElementById('studentForm');
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    
    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const cancelBtn = document.querySelector('.cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Click outside modal to close
    const modal = document.getElementById('studentModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }
    
    // Select all
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#studentTableBody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    // Enter key search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') filterStudents();
        });
    }
}

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

// ==================== Initialize ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 LTC Student Management System Starting...');
    checkLoginStatus();
    setupEventListeners();
    
    // ถ้าอยู่ในหน้า index (ไม่ใช่ login)
    if (!window.location.pathname.includes('login.html')) {
        await loadStudentsData();
        
        // ทดสอบการเชื่อมต่อ API
        setTimeout(() => {
            testAPIConnection();
        }, 1000);
    }
});';

// ตัวแปร Global
let studentsData = [];
let currentUserRole = 'guest';
let currentUserName = '';
let levelChart = null;
let majorChart = null;

// ==================== ฟังก์ชันเรียก API ====================

/**
 * เรียก API ของ Google Apps Script
 * @param {string} action - ชื่อ action ที่ต้องการเรียก
 * @param {object} data - ข้อมูลที่ส่งไป (สำหรับ POST)
 * @param {string} method - GET หรือ POST
 * @returns {Promise} - ผลลัพธ์จาก API
 */
async function callAPI(action, data = {}, method = 'GET') {
    try {
        let url = `${GAS_URL}?action=${action}`;
        
        // ถ้าเป็น GET ให้เพิ่ม parameter ใน URL
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
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        // ถ้าเป็น POST ให้ใส่ body
        if (method === 'POST') {
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

/**
 * ทดสอบการเชื่อมต่อ API
 */
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

/**
 * โหลดข้อมูลนักเรียนทั้งหมดจาก GAS
 */
async function loadStudentsData() {
    try {
        showLoading(true);
        studentsData = await callAPI('getStudents', {}, 'GET');
        
        // แก้ไขข้อมูล room ที่เป็นวันที่ผิดพลาด
        studentsData = studentsData.map(student => {
            if (student.room && typeof student.room === 'string' && student.room.includes('T')) {
                student.room = '';
            }
            // แก้ไข student_code ให้เป็น string
            if (student.student_code) {
                student.student_code = String(student.student_code);
            }
            // แก้ไข phone ให้เป็น string
            if (student.phone) {
                student.phone = String(student.phone);
            }
            return student;
        });
        
        console.log('Loaded students:', studentsData.length, 'records');
        displayStudentsTable();
        updateDashboard();
        updateFilters();
        showLoading(false);
        return studentsData;
    } catch (error) {
        showLoading(false);
        console.error('Load data error:', error);
        showNotification('error', 'ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ');
        
        // แสดงข้อความแจ้งเตือนให้ตั้งค่า URL
        if (GAS_URL === 'https://script.google.com/macros/s/AKfycbzaAfeFT1di1iOTcx8_PF7iwHMXT8ly40oM0PDLHM0rnc3LMeFs72KAhxqTiH-vSz5egQ/exec') {
            document.getElementById('studentTableBody').innerHTML = 
                '<tr><td colspan="10" class="loading">⚠️ กรุณาตั้งค่า GAS_URL ในไฟล์ script.js ให้ถูกต้อง<br>หลังจาก Deploy GAS แล้ว ให้คัดลอก URL มาใส่ใน const GAS_URL</td></tr>';
        }
        return [];
    }
}

/**
 * โหลดข้อมูลตามตัวกรอง
 */
async function loadFilteredStudents() {
    try {
        const filters = getFilters();
        const filteredData = await callAPI('getFilteredStudents', filters, 'GET');
        studentsData = filteredData;
        displayStudentsTable();
        updateDashboard();
    } catch (error) {
        console.error('Filter error:', error);
    }
}

/**
 * แสดง/ซ่อน loading
 */
function showLoading(show) {
    const tbody = document.getElementById('studentTableBody');
    if (show && tbody && (!studentsData || studentsData.length === 0)) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
    }
}

/**
 * อัปเดตตัวเลือกใน filter dropdown
 */
function updateFilters() {
    if (!studentsData || studentsData.length === 0) return;
    
    // อัปเดตระดับชั้น
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
    
    // อัปเดตสาขาวิชา
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
    
    // อัปเดตรอบเรียน
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
    
    // อัปเดตสถิติรวม (ไม่ใช้ filter)
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
    // อัปเดตกราฟระดับชั้น
    const levelCtx = document.getElementById('levelChart')?.getContext('2d');
    if (levelCtx) {
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
    
    // อัปเดตกราฟสาขาวิชา
    const majorCtx = document.getElementById('majorChart')?.getContext('2d');
    if (majorCtx) {
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
                },
                plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.raw} คน` } } }
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
    
    // ตรวจสอบข้อมูลที่จำเป็น
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
    
    let html = '<table style="width:100%; border-collapse: collapse; font-size: 10px;">';
    html += '<thead><tr style="background:#f0f0f0;">';
    html += '<th style="border:1px solid #000; padding:5px;">#</th>';
    html += '<th style="border:1px solid #000; padding:5px;">รหัสนักศึกษา</th>';
    html += '<th style="border:1px solid #000; padding:5px;">ชื่อ-สกุล</th>';
    html += '<th style="border:1px solid #000; padding:5px;">ระดับชั้น</th>';
    html += '<th style="border:1px solid #000; padding:5px;">สาขาวิชา</th>';
    
    for (let i = 1; i <= 25; i++) {
        html += `<th style="border:1px solid #000; padding:5px; width:30px">รอบ ${i}</th>`;
    }
    
    html += '</tr></thead><tbody>';
    
    printData.forEach((student, index) => {
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '';
        html += `<tr>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${index + 1}</td>
            <td style="border:1px solid #000; padding:5px;">${student.student_code || ''}</td>
            <td style="border:1px solid #000; padding:5px;">${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}</td>
            <td style="border:1px solid #000; padding:5px; text-align:center;">${student.level || ''}</td>
            <td style="border:1px solid #000; padding:5px;">${student.major || ''} ${roomDisplay}</td>`;
        
        for (let i = 1; i <= 25; i++) {
            html += `<td style="border:1px solid #000; width:30px; text-align:center;">&nbsp;</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>รายชื่อนักศึกษา - LTC</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Sarabun', sans-serif; margin: 20px; }
                h2, h3 { text-align: center; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
                th { background: #f0f0f0; font-weight: bold; }
                .signature-line { margin-top: 30px; text-align: right; }
                @media print {
                    body { margin: 0; padding: 10px; }
                }
            </style>
        </head>
        <body>
            <h2>สถาบันเทคโนโลยีลาดกระบัง วิทยาเขตแหลมทอง</h2>
            <h3>รายชื่อนักศึกษา ${filters.level || 'ทุกระดับชั้น'} ${filters.major ? 'สาขา ' + filters.major : ''}</h3>
            <p style="text-align:center;">(พร้อมช่องเซ็นชื่อ 25 ครั้ง)</p>
            ${html}
            <div class="signature-line">
                ลงชื่อ......................................................ผู้บันทึก<br>
                (......................................................)<br>
                วันที่.........../.........../...........
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

// ==================== Import Excel ====================

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
                showNotification('success', `นำเข้าข้อมูลสำเร็จ ${result.imported || newStudents.length} รายการ${result.failed ? ` (ล้มเหลว ${result.failed} รายการ)` : ''}`);
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

// ==================== Attendance Functions ====================

async function generateAttendanceTable() {
    const level = document.getElementById('attendanceLevel')?.value;
    const major = document.getElementById('attendanceMajor')?.value;
    
    if (!level) {
        showNotification('warning', 'กรุณาเลือกระดับชั้น');
        return;
    }
    
    let filteredData = studentsData.filter(s => s.level === level);
    if (major && major !== '') {
        filteredData = filteredData.filter(s => s.major === major);
    }
    
    if (filteredData.length === 0) {
        const container = document.getElementById('attendanceTableContainer');
        if (container) container.innerHTML = '<div class="loading">📭 ไม่พบข้อมูลนักศึกษาในระดับชั้นนี้</div>';
        return;
    }
    
    let html = '<div id="attendancePrintTable">';
    html += '<h3 style="text-align:center;">ใบเช็คชื่อนักศึกษา</h3>';
    html += `<h4 style="text-align:center;">ระดับชั้น: ${level} ${major ? ' | สาขา: ' + major : ''}</h4>`;
    html += '<table class="attendance-table" style="width:100%; border-collapse: collapse;">';
    html += '<thead><tr style="background:#f0f0f0;">';
    html += '<th style="border:1px solid #000; padding:6px;">ลำดับ</th>';
    html += '<th style="border:1px solid #000; padding:6px;">รหัสนักศึกษา</th>';
    html += '<th style="border:1px solid #000; padding:6px;">ชื่อ-สกุล</th>';
    html += '<th style="border:1px solid #000; padding:6px;">ระดับชั้น</th>';
    html += '<th style="border:1px solid #000; padding:6px;">สาขาวิชา</th>';
    
    for (let i = 1; i <= 25; i++) {
        html += `<th style="border:1px solid #000; padding:6px; width:35px;">รอบ ${i}</th>`;
    }
    
    html += '</tr></thead><tbody>';
    
    filteredData.forEach((student, index) => {
        const roomDisplay = (student.room && !student.room.includes('T')) ? student.room : '';
        html += `<tr>
            <td style="border:1px solid #000; padding:6px; text-align:center;">${index + 1}</td>
            <td style="border:1px solid #000; padding:6px;">${student.student_code || ''}</td>
            <td style="border:1px solid #000; padding:6px;">${student.prefix || ''}${student.first_name || ''} ${student.last_name || ''}</td>
            <td style="border:1px solid #000; padding:6px; text-align:center;">${student.level || ''}</td>
            <td style="border:1px solid #000; padding:6px;">${student.major || ''} ${roomDisplay}</td>`;
        
        for (let i = 1; i <= 25; i++) {
            html += `<td style="border:1px solid #000; width:35px; text-align:center;">&nbsp;</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    html += '<div style="margin-top: 30px; text-align: right;">ลงชื่อ...............................................ผู้บันทึก<br>(......................................................)<br>วันที่.........../.........../...........</div>';
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
            <style>
                body { font-family: 'Sarabun', sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
                th { background: #f0f0f0; font-weight: bold; }
                @media print {
                    body { margin: 0; padding: 10px; }
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
    const major = document.getElementById('reportMajor')?.value;
    
    let reportData = studentsData;
    if (level && level !== '') reportData = reportData.filter(s => s.level === level);
    if (major && major !== '') reportData = reportData.filter(s => s.major === major);
    
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
            <p><strong>เงื่อนไข:</strong> ${level ? 'ระดับชั้น ' + level : 'ทุกระดับชั้น'} ${major ? ' | สาขา ' + major : ''}</p>
            <p><strong>จำนวนนักเรียนทั้งหมด:</strong> ${reportData.length} คน</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>📚 จำแนกตามระดับชั้น</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(levelStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                    ${Object.keys(levelStats).length === 0 ? '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>' : ''}
                    <tr style="border-top:2px solid #ddd"><td><strong>รวม</strong></td><td><strong>${reportData.length} คน</strong></td></tr>
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>🏢 จำแนกตามสาขาวิชา</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(majorStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                    ${Object.keys(majorStats).length === 0 ? '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>' : ''}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>🕐 จำแนกตามรอบเรียน</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(serialStats).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                    ${Object.keys(serialStats).length === 0 ? '<tr><td colspan="2">ไม่มีข้อมูล</td></tr>' : ''}
                </table>
            </div>
            <div style="background: var(--card-bg, white); padding: 15px; border-radius: 12px; border: 1px solid #ddd;">
                <h4>✅ จำแนกตามสถานะ</h4>
                <table style="width:100%; border-collapse: collapse;">
                    ${Object.entries(statusStats).filter(([_,v]) => v > 0).map(([k,v]) => `<tr><td>${k}</td><td><strong>${v}</strong> คน</td></tr>`).join('')}
                </table>
            </div>
        </div>
    `;
    
    html += `
        <div style="margin-top: 30px;">
            <h4>📋 รายชื่อนักศึกษา</h4>
            <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="border:1px solid #ddd; padding:8px;">#</th>
                        <th style="border:1px solid #ddd; padding:8px;">รหัสนักศึกษา</th>
                        <th style="border:1px solid #ddd; padding:8px;">ชื่อ-สกุล</th>
                        <th style="border:1px solid #ddd; padding:8px;">ระดับชั้น</th>
                        <th style="border:1px solid #ddd; padding:8px;">สาขาวิชา</th>
                        <th style="border:1px solid #ddd; padding:8px;">รอบเรียน</th>
                        <th style="border:1px solid #ddd; padding:8px;">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map((s, idx) => {
                        const roomDisplay = (s.room && !s.room.includes('T')) ? s.room : '';
                        return `
                        <tr>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx + 1}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${s.student_code || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${s.prefix || ''}${s.first_name || ''} ${s.last_name || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${s.level || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px;">${s.major || ''} ${roomDisplay}</td>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${s.serial || ''}</td>
                            <td style="border:1px solid #ddd; padding:6px; text-align:center;">${s.status || ''}</td>
                        </tr>
                    `}).join('')}
                    ${reportData.length === 0 ? '<tr><td colspan="7" style="text-align:center;">ไม่มีข้อมูล</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
    
    const reportResult = document.getElementById('reportResult');
    if (reportResult) reportResult.innerHTML = html;
}

function exportReportToExcel() {
    const level = document.getElementById('reportLevel')?.value;
    const major = document.getElementById('reportMajor')?.value;
    
    let reportData = studentsData;
    if (level && level !== '') reportData = reportData.filter(s => s.level === level);
    if (major && major !== '') reportData = reportData.filter(s => s.major === major);
    
    const worksheetData = reportData.map((s, idx) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Report');
    XLSX.writeFile(wb, `report_${level || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showNotification('success', 'ส่งออกรายงานเรียบร้อย');
}

// ==================== Notification ====================

function showNotification(type, message) {
    Swal.fire({
        icon: type,
        title: type === 'success' ? 'สำเร็จ' : (type === 'error' ? 'ผิดพลาด' : (type === 'warning' ? 'คำเตือน' : 'แจ้งเตือน')),
        text: message,
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
    }).catch(() => {});
}

// ==================== Authentication ====================

async function login() {
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (!username || !password) {
        if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.innerHTML = '❌ กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        }
        return;
    }
    
    try {
        const result = await callAPI('authenticate', { username, password }, 'POST');
        
        if (result && result.success) {
            localStorage.setItem('ltc_user_role', result.user.role);
            localStorage.setItem('ltc_user_name', result.user.fullname);
            window.location.href = 'index.html';
        } else {
            if (errorMsg) {
                errorMsg.style.display = 'block';
                errorMsg.innerHTML = `❌ ${result?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'}`;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.innerHTML = '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
        }
    }
}

function guestLogin() {
    localStorage.setItem('ltc_user_role', 'guest');
    localStorage.setItem('ltc_user_name', 'ผู้เยี่ยมชม');
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('ltc_user_role');
    localStorage.removeItem('ltc_user_name');
    window.location.href = 'login.html';
}

// ==================== Event Listeners ====================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            switchPage(page);
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }
    
    // Mobile sidebar
    if (window.innerWidth <= 768) {
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('mobile-open');
            });
        }
    }
    
    // Theme toggle
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
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' && themeToggle) {
        themeToggle.checked = true;
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Logout
    const logoutSidebar = document.getElementById('logoutSidebar');
    if (logoutSidebar) logoutSidebar.addEventListener('click', logout);
    
    // Search and filter
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', filterStudents);
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadStudentsData());
    
    // Action buttons
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.addEventListener('click', openStudentModal);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.addEventListener('click', printWithSignatures);
    const importBtn = document.getElementById('importBtn');
    if (importBtn) importBtn.addEventListener('click', importExcelFile);
    
    // Attendance
    const genAttendanceBtn = document.getElementById('generateAttendanceBtn');
    if (genAttendanceBtn) genAttendanceBtn.addEventListener('click', generateAttendanceTable);
    const printAttendanceBtn = document.getElementById('printAttendanceBtn');
    if (printAttendanceBtn) printAttendanceBtn.addEventListener('click', printAttendance);
    
    // Report
    const genReportBtn = document.getElementById('generateReportBtn');
    if (genReportBtn) genReportBtn.addEventListener('click', generateReport);
    const exportReportBtn = document.getElementById('exportReportExcelBtn');
    if (exportReportBtn) exportReportBtn.addEventListener('click', exportReportToExcel);
    
    // Student form
    const studentForm = document.getElementById('studentForm');
    if (studentForm) studentForm.addEventListener('submit', saveStudent);
    
    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    const cancelBtn = document.querySelector('.cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Click outside modal to close
    const modal = document.getElementById('studentModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }
    
    // Select all
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#studentTableBody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    // Enter key search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') filterStudents();
        });
    }
}

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

// ==================== Initialize ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 LTC Student Management System Starting...');
    checkLoginStatus();
    setupEventListeners();
    
    // ถ้าอยู่ในหน้า index (ไม่ใช่ login)
    if (!window.location.pathname.includes('login.html')) {
        await loadStudentsData();
        
        // ทดสอบการเชื่อมต่อ API
        setTimeout(() => {
            testAPIConnection();
        }, 1000);
    }
});
