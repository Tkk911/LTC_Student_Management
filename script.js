// ==================== การตั้งค่า ====================
// 🔴 IMPORTANT: เปลี่ยน URL เป็น URL ที่ได้จากการ Deploy GAS
const GAS_URL = 'https://script.google.com/macros/s/AKfycbz7Ao1YKCDHwjJgRQD0iSAuJ_07rFM2ezpiZk8ISkRxYnpsx7r8oJHKiJs1dGt33SDA/exec';

// เปลี่ยนเป็น false เพื่อใช้ Google Sheets
const USE_LOCAL_STORAGE = false;

let students = [];
let currentUser = { role: 'guest', name: 'ผู้เยี่ยมชม' };
const SIGNATURE_COLUMNS = 25;

// ==================== ฟังก์ชันทดสอบการเชื่อมต่อ ====================

async function testGASConnection() {
    try {
        console.log('🔍 กำลังทดสอบการเชื่อมต่อ GAS...');
        console.log('URL:', GAS_URL);
        
        const response = await fetch(`${GAS_URL}?action=test`, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ เชื่อมต่อ GAS สำเร็จ:', result);
        return { success: true, data: result };
        
    } catch (error) {
        console.error('❌ เชื่อมต่อ GAS ล้มเหลว:', error);
        return { success: false, error: error.message };
    }
}

// ==================== ระบบสิทธิ์ผู้ใช้ ====================

function checkAuth() {
    const role = localStorage.getItem('ltc_user_role');
    const name = localStorage.getItem('ltc_user_name');
    
    if (!role) {
        window.location.href = 'login.html';
        return false;
    }
    
    currentUser.role = role;
    currentUser.name = name || (role === 'admin' ? 'Admin' : 'ผู้เยี่ยมชม');
    
    updateUIBasedOnRole();
    return true;
}

function updateUIBasedOnRole() {
    const roleBadge = document.getElementById('userRoleBadge');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (currentUser.role === 'admin') {
        roleBadge.textContent = '👑 แอดมิน';
        roleBadge.className = 'role-badge admin';
        userNameDisplay.textContent = ` ${currentUser.name}`;
        document.body.classList.remove('guest-mode');
    } else {
        roleBadge.textContent = '👤 ผู้เยี่ยมชม (ดูอย่างเดียว)';
        roleBadge.className = 'role-badge guest';
        userNameDisplay.textContent = ` ${currentUser.name}`;
        document.body.classList.add('guest-mode');
    }
}

function logout() {
    localStorage.removeItem('ltc_user_role');
    localStorage.removeItem('ltc_user_name');
    window.location.href = 'login.html';
}

// ==================== โหลดข้อมูลจาก Google Sheets ====================

async function loadStudents() {
    try {
        showLoading(true);
        
        if (USE_LOCAL_STORAGE) {
            // ใช้ Local Storage
            const saved = localStorage.getItem('ltc_students');
            if (saved) {
                students = JSON.parse(saved);
            } else {
                loadSampleData();
            }
            renderTable();
            updateStats();
        } else {
            // ใช้ Google Sheets
            console.log('📡 กำลังโหลดข้อมูลจาก Google Sheets...');
            
            // ทดสอบการเชื่อมต่อก่อน
            const testResult = await testGASConnection();
            if (!testResult.success) {
                throw new Error(`ไม่สามารถเชื่อมต่อ GAS: ${testResult.error}`);
            }
            
            // โหลดข้อมูล
            const response = await fetch(`${GAS_URL}?action=getStudents`, {
                method: 'GET',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📊 ข้อมูลที่ได้รับ:', result);
            
            if (result.success) {
                students = result.data || [];
                renderTable();
                updateStats();
                console.log(`✅ โหลดข้อมูลสำเร็จ: ${students.length} รายการ`);
            } else {
                throw new Error(result.message || 'โหลดข้อมูลล้มเหลว');
            }
        }
    } catch (error) {
        console.error('❌ โหลดข้อมูลล้มเหลว:', error);
        
        await Swal.fire({
            title: '⚠️ ไม่สามารถเชื่อมต่อ Google Sheets',
            html: `เกิดข้อผิดพลาด: <strong>${error.message}</strong><br><br>
                   <hr>
                   <div style="text-align:left; font-size:13px;">
                   <strong>🔧 วิธีแก้ไข:</strong><br>
                   1. ตรวจสอบว่า Deploy GAS แล้ว<br>
                   2. ตั้งค่า Access เป็น "Anyone"<br>
                   3. คัดลอก URL มาใส่ใน GAS_URL<br>
                   4. ทดสอบ URL: <br>
                   <code>${GAS_URL}?action=test</code>
                   </div>
                   <hr>
                   <br>ระบบจะใช้ <strong>ข้อมูลตัวอย่าง</strong> แทน`,
            icon: 'warning',
            confirmButtonText: 'ตกลง'
        });
        
        // ใช้ข้อมูลตัวอย่างสำรอง
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

function loadSampleData() {
    students = [
        { id: '1', code: '69301040060', prefix: 'นาย', firstname: 'ธนพล', lastname: 'ลัดดาแย้ม', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0812345678', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '2', code: '69301040061', prefix: 'นาย', firstname: 'รณกร', lastname: 'วิพัฒนกำจร', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0823456789', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '3', code: '69301040083', prefix: 'นาย', firstname: 'กิตติธัช', lastname: 'มาเสริฐ', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0834567890', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '4', code: '69301040095', prefix: 'นาย', firstname: 'วัชระพงษ์', lastname: 'สมสะกิจ', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0845678901', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '5', code: '69301040096', prefix: 'นาย', firstname: 'ภูรี', lastname: 'ราชอาด', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0856789012', status: 'กำลังศึกษา', created_at: new Date().toISOString() }
    ];
    
    if (USE_LOCAL_STORAGE) {
        localStorage.setItem('ltc_students', JSON.stringify(students));
    }
    renderTable();
    updateStats();
}

// ==================== บันทึกข้อมูลไป Google Sheets ====================

async function saveStudent(studentData) {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถแก้ไขข้อมูลได้', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        if (USE_LOCAL_STORAGE) {
            if (studentData.id) {
                const index = students.findIndex(s => s.id === studentData.id);
                if (index !== -1) {
                    students[index] = { ...students[index], ...studentData, updated_at: new Date().toISOString() };
                }
            } else {
                const newId = Date.now().toString();
                students.push({
                    ...studentData,
                    id: newId,
                    created_at: new Date().toISOString()
                });
            }
            localStorage.setItem('ltc_students', JSON.stringify(students));
            await loadStudents();
            Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
            closeModal();
        } else {
            // บันทึกไป Google Sheets
            const action = studentData.id ? 'updateStudent' : 'addStudent';
            
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, ...studentData })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                Swal.fire('สำเร็จ', result.message || 'บันทึกข้อมูลเรียบร้อย', 'success');
                closeModal();
                await loadStudents();
            } else {
                throw new Error(result.message || 'บันทึกข้อมูลล้มเหลว');
            }
        }
    } catch (error) {
        console.error('บันทึกข้อมูลล้มเหลว:', error);
        Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== ลบข้อมูลจาก Google Sheets ====================

async function deleteStudent(id) {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถลบข้อมูลได้', 'warning');
        return;
    }
    
    const result = await Swal.fire({
        title: 'ยืนยันการลบ',
        text: 'คุณต้องการลบข้อมูลนี้ใช่หรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f44336',
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        showLoading(true);
        
        if (USE_LOCAL_STORAGE) {
            students = students.filter(s => s.id !== id);
            localStorage.setItem('ltc_students', JSON.stringify(students));
            await loadStudents();
            Swal.fire('ลบสำเร็จ', 'ข้อมูลถูกลบเรียบร้อย', 'success');
        } else {
            // ลบจาก Google Sheets
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'deleteStudent', id: id })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                Swal.fire('ลบสำเร็จ', data.message || 'ข้อมูลถูกลบเรียบร้อย', 'success');
                await loadStudents();
            } else {
                throw new Error(data.message || 'ลบข้อมูลล้มเหลว');
            }
        }
    } catch (error) {
        console.error('ลบข้อมูลล้มเหลว:', error);
        Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== การแสดงผล ====================

function renderTable() {
    const tbody = document.getElementById('studentTableBody');
    const filterLevel = document.getElementById('filterLevel').value;
    const filterMajor = document.getElementById('filterMajor').value;
    const filterSerial = document.getElementById('filterSerial').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = students.filter(student => {
        if (filterLevel && student.level !== filterLevel) return false;
        if (filterMajor && student.major !== filterMajor) return false;
        if (filterSerial && student.serial !== filterSerial) return false;
        if (searchTerm) {
            const fullName = `${student.prefix}${student.firstname} ${student.lastname}`;
            return student.code.includes(searchTerm) || fullName.toLowerCase().includes(searchTerm);
        }
        return true;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">📭 ไม่พบข้อมูล</td></tr>';
        return;
    }
    
    const isAdmin = currentUser.role === 'admin';
    
    tbody.innerHTML = filtered.map((student, index) => {
        let statusClass = '';
        if (student.status === 'กำลังศึกษา') statusClass = 'status-active';
        else if (student.status === 'จบการศึกษา') statusClass = 'status-graduated';
        else statusClass = 'status-inactive';
        
        const actionButtons = isAdmin ? `
            <td class="action-buttons">
                <button class="btn btn-secondary" onclick="editStudent('${student.id}')" style="padding: 4px 8px;">✏️</button>
                <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" style="padding: 4px 8px;">🗑️</button>
            </td>
        ` : '<td>-</td>';
        
        return `
            <tr>
                <td><input type="checkbox" class="studentCheckbox" data-id="${student.id}" ${!isAdmin ? 'disabled' : ''}></td>
                <td>${index + 1}</td>
                <td><strong>${student.code}</strong></td>
                <td>${student.prefix}${student.firstname} ${student.lastname}</td>
                <td>${student.level}</td>
                <td>${student.room || '-'}</td>
                <td>${student.major}</td>
                <td>${student.serial}</td>
                <td><span class="status-badge ${statusClass}">${student.status}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');
}

function updateStats() {
    const total = students.length;
    const active = students.filter(s => s.status === 'กำลังศึกษา').length;
    const graduated = students.filter(s => s.status === 'จบการศึกษา').length;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('activeCount').textContent = active;
    document.getElementById('graduatedCount').textContent = graduated;
}

function editStudent(id) {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถแก้ไขข้อมูลได้', 'warning');
        return;
    }
    
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    document.getElementById('modalTitle').textContent = '✏️ แก้ไขข้อมูลนักศึกษา';
    document.getElementById('studentId').value = student.id;
    document.getElementById('studentCode').value = student.code;
    document.getElementById('prefix').value = student.prefix;
    document.getElementById('firstName').value = student.firstname;
    document.getElementById('lastName').value = student.lastname;
    document.getElementById('level').value = student.level;
    document.getElementById('room').value = student.room || '';
    document.getElementById('major').value = student.major;
    document.getElementById('serial').value = student.serial;
    document.getElementById('phone').value = student.phone || '';
    document.getElementById('status').value = student.status;
    
    document.getElementById('studentModal').style.display = 'block';
}

// ==================== การนำเข้า/ส่งออก ====================

function importExcel(file) {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถนำเข้าข้อมูลได้', 'warning');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            
            if (rows.length === 0) {
                Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในไฟล์', 'warning');
                return;
            }
            
            Swal.fire({
                title: 'ยืนยันการนำเข้า',
                html: `พบข้อมูล ${rows.length} รายการ<br>คุณต้องการนำเข้าข้อมูลหรือไม่?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'นำเข้า',
                cancelButtonText: 'ยกเลิก'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    showLoading(true);
                    const newStudents = rows.map((row, index) => ({
                        id: Date.now() + index + '',
                        code: row['รหัสนักศึกษา'] || row['code'] || '',
                        prefix: row['คำนำหน้า'] || row['prefix'] || 'นาย',
                        firstname: row['ชื่อ'] || row['firstname'] || '',
                        lastname: row['นามสกุล'] || row['lastname'] || '',
                        level: row['ระดับชั้น'] || row['level'] || 'ปวส.1',
                        room: row['ห้อง'] || row['room'] || '',
                        major: row['สาขาวิชา'] || row['major'] || 'ไฟฟ้ากำลัง',
                        serial: row['รอบเรียน'] || row['serial'] || 'เช้า',
                        phone: row['เบอร์โทร'] || row['phone'] || '',
                        status: row['สถานะ'] || row['status'] || 'กำลังศึกษา',
                        created_at: new Date().toISOString()
                    }));
                    
                    if (USE_LOCAL_STORAGE) {
                        students.push(...newStudents);
                        localStorage.setItem('ltc_students', JSON.stringify(students));
                        await loadStudents();
                        Swal.fire('สำเร็จ', `นำเข้าข้อมูล ${newStudents.length} รายการ`, 'success');
                    } else {
                        // ส่งไป Google Sheets
                        const response = await fetch(GAS_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'batchImport', students: newStudents })
                        });
                        const resData = await response.json();
                        if (resData.success) {
                            Swal.fire('สำเร็จ', resData.message, 'success');
                            await loadStudents();
                        } else {
                            throw new Error(resData.message);
                        }
                    }
                    showLoading(false);
                }
            });
        } catch (error) {
            console.error('นำเข้าข้อมูลล้มเหลว:', error);
            Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    const exportData = students.map((s, idx) => ({
        'ลำดับ': idx + 1,
        'รหัสนักศึกษา': s.code,
        'คำนำหน้า': s.prefix,
        'ชื่อ': s.firstname,
        'นามสกุล': s.lastname,
        'ระดับชั้น': s.level,
        'ห้อง': s.room,
        'สาขาวิชา': s.major,
        'รอบเรียน': s.serial,
        'เบอร์โทร': s.phone,
        'สถานะ': s.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักศึกษา');
    XLSX.writeFile(wb, `รายชื่อนักศึกษา_LTC_${new Date().toLocaleDateString('th-TH')}.xlsx`);
    
    Swal.fire('สำเร็จ', 'ส่งออกไฟล์ Excel เรียบร้อย', 'success');
}

function printToPDF() {
    const filterLevel = document.getElementById('filterLevel').options[document.getElementById('filterLevel').selectedIndex]?.text || 'ทั้งหมด';
    const filterMajor = document.getElementById('filterMajor').options[document.getElementById('filterMajor').selectedIndex]?.text || 'ทั้งหมด';
    const filterSerial = document.getElementById('filterSerial').options[document.getElementById('filterSerial').selectedIndex]?.text || 'ทั้งหมด';
    
    let filteredStudents = students;
    if (document.getElementById('filterLevel').value) {
        filteredStudents = filteredStudents.filter(s => s.level === document.getElementById('filterLevel').value);
    }
    if (document.getElementById('filterMajor').value) {
        filteredStudents = filteredStudents.filter(s => s.major === document.getElementById('filterMajor').value);
    }
    if (document.getElementById('filterSerial').value) {
        filteredStudents = filteredStudents.filter(s => s.serial === document.getElementById('filterSerial').value);
    }
    
    let signatureHeaders = '';
    for (let i = 1; i <= SIGNATURE_COLUMNS; i++) {
        signatureHeaders += `<th class="signature-col" style="width:20px; font-size:10px;">${i}</th>`;
    }
    
    let tableRows = '';
    filteredStudents.forEach((s, index) => {
        let signatureCells = '';
        for (let i = 1; i <= SIGNATURE_COLUMNS; i++) {
            signatureCells += `<td class="signature-col" style="height:30px;">&nbsp;</td>`;
        }
        tableRows += `
            <tr>
                <td style="text-align:center">${index + 1}</td>
                <td style="text-align:center">${s.code}</td>
                <td>${s.prefix}${s.firstname} ${s.lastname}</td>
                <td style="text-align:center">${s.level}</td>
                <td style="text-align:center">${s.room || '-'}</td>
                <td>${s.major}</td>
                <td style="text-align:center">${s.serial}</td>
                ${signatureCells}
            </tr>
        `;
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>รายชื่อนักศึกษา LTC</title>
            <style>
                * { font-family: 'Sarabun', 'Angsana New', 'Tahoma', sans-serif; box-sizing: border-box; }
                body { padding: 10px; margin: 0; }
                .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #333; }
                .header h1 { margin: 0; color: #1a2a6c; font-size: 20px; }
                .header h2 { margin: 5px 0; color: #555; font-size: 18px; }
                .header h3 { margin: 3px 0; font-size: 16px; }
                .logo-print { font-size: 22px; font-weight: bold; color: #FFD700; background: #1a2a6c; display: inline-block; padding: 5px 15px; border-radius: 8px; }
                .filter-info { text-align: center; margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #000; padding: 6px 3px; text-align: left; vertical-align: top; }
                th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 11px; }
                td { text-align: left; }
                td:first-child, td:nth-child(2), td:nth-child(4), td:nth-child(5), td:nth-child(7) { text-align: center; }
                .signature-col { text-align: center; font-size: 10px; }
                .footer { margin-top: 15px; text-align: right; font-size: 12px; }
                .signature { margin-top: 20px; display: flex; justify-content: space-between; }
                .signature div { text-align: center; width: 200px; font-size: 13px; }
                .signature-line { margin-top: 30px; border-top: 1px solid #000; width: 100%; }
                @media print {
                    body { padding: 0; margin: 0.5cm; }
                    table { page-break-inside: avoid; }
                    tr { page-break-inside: avoid; page-break-after: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-print">LAEMTHONG TECHNOLOGY COLLEGE</div>
                <h1>วิทยาลัยเทคโนโลยีแหมทอง</h1>
                <h2>รายชื่อนักศึกษา</h2>
                <h3>ประจำภาคเรียนที่ 1 ปีการศึกษา 2567</h3>
            </div>
            <div class="filter-info">
                <strong>ระดับชั้น:</strong> ${filterLevel} | 
                <strong>สาขาวิชา:</strong> ${filterMajor} | 
                <strong>รอบเรียน:</strong> ${filterSerial} |
                <strong>จำนวนนักศึกษา:</strong> ${filteredStudents.length} คน
            </div>
            <table>
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="width:40px;">ลำดับ</th>
                        <th style="width:100px;">รหัสนักศึกษา</th>
                        <th style="width:150px;">ชื่อ-สกุล</th>
                        <th style="width:60px;">ระดับชั้น</th>
                        <th style="width:40px;">ห้อง</th>
                        <th style="width:120px;">สาขาวิชา</th>
                        <th style="width:50px;">รอบ</th>
                        ${signatureHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="signature">
                <div>
                    <div class="signature-line"></div>
                    (................................)<br>
                    ครูที่ปรึกษา
                </div>
                <div>
                    <div class="signature-line"></div>
                    (................................)<br>
                    หัวหน้าแผนก
                </div>
                <div>
                    <div class="signature-line"></div>
                    (................................)<br>
                    ผู้บริหารสถานศึกษา
                </div>
            </div>
            <div class="footer">
                วันที่พิมพ์: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ==================== ฟังก์ชันช่วยเหลือ ====================

function showLoading(show) {
    const tbody = document.getElementById('studentTableBody');
    if (show && students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">⏳ กำลังโหลดข้อมูล...</td></tr>';
    }
}

function openModal() {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถเพิ่มข้อมูลได้', 'warning');
        return;
    }
    document.getElementById('modalTitle').textContent = '➕ เพิ่มข้อมูลนักศึกษา';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('studentModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('studentModal').style.display = 'none';
}

function resetFilters() {
    document.getElementById('filterLevel').value = '';
    document.getElementById('filterMajor').value = '';
    document.getElementById('filterSerial').value = '';
    document.getElementById('searchInput').value = '';
    renderTable();
}

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
    
    loadStudents();
    
    document.getElementById('addBtn').onclick = openModal;
    document.querySelector('.close').onclick = closeModal;
    document.querySelectorAll('.cancelBtn').forEach(btn => btn.onclick = closeModal);
    window.onclick = (e) => { if (e.target === document.getElementById('studentModal')) closeModal(); };
    
    document.getElementById('studentForm').onsubmit = (e) => {
        e.preventDefault();
        const studentData = {
            id: document.getElementById('studentId').value,
            code: document.getElementById('studentCode').value,
            prefix: document.getElementById('prefix').value,
            firstname: document.getElementById('firstName').value,
            lastname: document.getElementById('lastName').value,
            level: document.getElementById('level').value,
            room: document.getElementById('room').value,
            major: document.getElementById('major').value,
            serial: document.getElementById('serial').value,
            phone: document.getElementById('phone').value,
            status: document.getElementById('status').value
        };
        saveStudent(studentData);
    };
    
    document.getElementById('searchBtn').onclick = renderTable;
    document.getElementById('resetBtn').onclick = resetFilters;
    document.getElementById('refreshBtn').onclick = loadStudents;
    document.getElementById('exportBtn').onclick = exportToExcel;
    document.getElementById('printBtn').onclick = printToPDF;
    document.getElementById('logoutBtn').onclick = logout;
    
    document.getElementById('importBtn').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls, .csv';
        input.onchange = (e) => {
            if (e.target.files[0]) importExcel(e.target.files[0]);
        };
        input.click();
    };
    
    document.getElementById('selectAll').onchange = (e) => {
        if (currentUser.role === 'admin') {
            document.querySelectorAll('.studentCheckbox').forEach(cb => cb.checked = e.target.checked);
        }
    };
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') renderTable();
    });
});