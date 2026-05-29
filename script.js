// ==================== LTC Student Management System - Frontend (Full Optimized Version) ====================
// วิทยาลัยเทคโนโลยีแหมทอง (Laemthong Technology College)
// ระบบจัดการรายชื่อนักศึกษา - ฉบับสมบูรณ์ พร้อมระบบจัดการข้อมูลขนาดใหญ่
// Version: 3.0
// Last Updated: 2026-05-29

// ==================== การตั้งค่า ====================
// 🔴 IMPORTANT: เปลี่ยน URL เป็น URL ที่ได้จากการ Deploy GAS
// ต้องลงท้ายด้วย /exec เสมอ
let GAS_URL = 'https://script.google.com/macros/s/AKfycbyu7RKvIUzxgSeR8M8MCzXVAdU_QFGZLUKDdgiBoOUkCguH_T1X6QYDaNWW68MsIqyK/exec';

// เปลี่ยนเป็น false เพื่อใช้ Google Sheets (ต้องตั้งค่า GAS_URL ให้ถูกต้อง)
const USE_LOCAL_STORAGE = false;

let students = [];
let currentUser = { role: 'guest', name: 'ผู้เยี่ยมชม' };
const SIGNATURE_COLUMNS = 25;

// ==================== Pagination Variables ====================
let currentPage = 1;
let pageSize = 50;
let totalPages = 0;
let totalStudents = 0;
let isLoading = false;
let searchTimeout = null;
let currentFilters = {};

// ==================== ฟังก์ชันทดสอบการเชื่อมต่อ ====================

async function testGASConnection() {
    try {
        console.log('🔍 กำลังทดสอบการเชื่อมต่อ GAS...');
        console.log('URL:', GAS_URL);
        
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'test' }),
            mode: 'cors',
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

// ฟังก์ชันสำหรับรับ URL จาก localStorage (ถ้ามี)
function getGASUrl() {
    const savedUrl = localStorage.getItem('ltc_gas_url');
    if (savedUrl && savedUrl.includes('script.google.com')) {
        return savedUrl;
    }
    return GAS_URL;
}

// ฟังก์ชันบันทึก URL
function saveGASUrl(url) {
    if (url && url.includes('script.google.com')) {
        localStorage.setItem('ltc_gas_url', url);
        GAS_URL = url;
        return true;
    }
    return false;
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

async function loadStudents(resetPage = true) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading(true);
        
        if (resetPage) {
            currentPage = 1;
        }
        
        if (USE_LOCAL_STORAGE) {
            const saved = localStorage.getItem('ltc_students');
            if (saved) {
                students = JSON.parse(saved);
                totalStudents = students.length;
                totalPages = Math.ceil(totalStudents / pageSize);
                renderTable();
                updateStats();
                updatePaginationControls();
            } else {
                loadSampleData();
            }
        } else {
            console.log(`📡 กำลังโหลดข้อมูลหน้า ${currentPage}...`);
            
            currentFilters = {
                level: document.getElementById('filterLevel')?.value || '',
                major: document.getElementById('filterMajor')?.value || '',
                serial: document.getElementById('filterSerial')?.value || '',
                search: document.getElementById('searchInput')?.value || ''
            };
            
            const url = getGASUrl();
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    action: 'getStudentsPaginated',
                    page: currentPage,
                    pageSize: pageSize,
                    filters: currentFilters
                }),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📊 ข้อมูลที่ได้รับ:', result);
            
            if (result.success) {
                students = result.data || [];
                totalPages = result.totalPages;
                totalStudents = result.total;
                
                renderTable();
                updateStats();
                updatePaginationControls();
                
                console.log(`✅ โหลดข้อมูลสำเร็จ: ${students.length}/${totalStudents} รายการ (หน้า ${currentPage}/${totalPages})`);
            } else {
                throw new Error(result.message || 'โหลดข้อมูลล้มเหลว');
            }
        }
    } catch (error) {
        console.error('❌ โหลดข้อมูลล้มเหลว:', error);
        showErrorAndFallback(error);
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

function showErrorAndFallback(error) {
    Swal.fire({
        title: '⚠️ ไม่สามารถเชื่อมต่อ Google Sheets',
        html: `
            <div style="text-align:left;">
                <p>เกิดข้อผิดพลาด: <strong>${error.message}</strong></p>
                <hr>
                <p><strong>🔧 วิธีแก้ไข:</strong></p>
                <ol style="text-align:left; margin-left:20px;">
                    <li>เปิดไฟล์ <strong>Google Sheets</strong> ที่ต้องการใช้</li>
                    <li>ไปที่ <strong>Extensions → Apps Script</strong></li>
                    <li>วางโค้ด <strong>GAS.txt</strong> ลงใน editor</li>
                    <li>คลิก <strong>Deploy → New deployment</strong></li>
                    <li>เลือก <strong>Web app</strong> ตั้งค่า Execute as: "Me", Access: "Anyone"</li>
                    <li>คัดลอก URL (ลงท้ายด้วย /exec) มาใส่ด้านล่าง</li>
                </ol>
                <hr>
                <div class="input-group" style="margin-top:10px;">
                    <label>📎 วาง URL ที่ได้จากการ Deploy:</label>
                    <input type="text" id="gasUrlInput" style="width:100%; padding:8px; margin-top:5px; border:1px solid #ddd; border-radius:5px;" 
                           placeholder="https://script.google.com/macros/s/.../exec" value="${getGASUrl()}">
                    <button id="saveUrlBtn" style="margin-top:10px; padding:8px 15px; background:#4caf50; color:white; border:none; border-radius:5px; cursor:pointer;">💾 บันทึกและทดสอบ</button>
                </div>
            </div>
        `,
        icon: 'warning',
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'ใช้ข้อมูลตัวอย่าง',
        didOpen: () => {
            const saveBtn = document.getElementById('saveUrlBtn');
            if (saveBtn) {
                saveBtn.onclick = async () => {
                    const newUrl = document.getElementById('gasUrlInput').value.trim();
                    if (newUrl) {
                        if (saveGASUrl(newUrl)) {
                            const testResult = await testGASConnection();
                            if (testResult.success) {
                                Swal.fire('สำเร็จ', 'เชื่อมต่อ GAS สำเร็จ!', 'success').then(() => {
                                    window.location.reload();
                                });
                            } else {
                                Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อ URL ที่ระบุได้', 'error');
                            }
                        } else {
                            Swal.fire('ผิดพลาด', 'URL ไม่ถูกต้อง', 'error');
                        }
                    } else {
                        Swal.fire('กรุณาใส่ URL', '', 'warning');
                    }
                };
            }
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
            loadSampleData();
        }
    });
}

// ==================== Pagination Controls ====================

function updatePaginationControls() {
    let paginationContainer = document.getElementById('paginationContainer');
    
    if (!paginationContainer && totalPages > 1) {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'paginationContainer';
            paginationContainer.className = 'pagination-container';
            tableContainer.parentNode.insertBefore(paginationContainer, tableContainer.nextSibling);
        }
    }
    
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = `
        <div class="pagination-info">
            แสดง ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, totalStudents)} จาก ${totalStudents} รายการ
        </div>
        <div class="pagination-controls">
            <button class="btn-pagination" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>⏮️ แรก</button>
            <button class="btn-pagination" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀ ก่อนหน้า</button>
            <span class="page-info">หน้า ${currentPage} / ${totalPages}</span>
            <button class="btn-pagination" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>ถัดไป ▶</button>
            <button class="btn-pagination" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>สุดท้าย ⏭️</button>
        </div>
        <div class="page-size-selector">
            <label>แสดง:</label>
            <select id="pageSizeSelect" onchange="changePageSize()">
                <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
                <option value="200" ${pageSize === 200 ? 'selected' : ''}>200</option>
            </select>
            <span>รายการ</span>
        </div>
    `;
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    loadStudents(false);
}

function changePageSize() {
    const select = document.getElementById('pageSizeSelect');
    if (select) {
        const newSize = parseInt(select.value);
        if (newSize === pageSize) return;
        pageSize = newSize;
        currentPage = 1;
        loadStudents(true);
    }
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
            await loadStudents(true);
            Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
            closeModal();
        } else {
            const action = studentData.id ? 'updateStudent' : 'addStudent';
            const url = getGASUrl();
            
            console.log(`📤 กำลังส่งข้อมูล: ${action}`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, ...studentData }),
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📥 ผลลัพธ์:', result);
            
            if (result.success) {
                Swal.fire('สำเร็จ', result.message || 'บันทึกข้อมูลเรียบร้อย', 'success');
                closeModal();
                await loadStudents(true);
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

// ==================== ลบข้อมูล ====================

async function deleteStudent(id, showAlert = true) {
    if (currentUser.role !== 'admin') {
        if (showAlert) Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถลบข้อมูลได้', 'warning');
        return false;
    }
    
    if (showAlert) {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบข้อมูลนี้ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f44336',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });
        if (!result.isConfirmed) return false;
    }
    
    try {
        showLoading(true);
        
        const url = getGASUrl();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'deleteStudent', id: id }),
            mode: 'cors'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (showAlert) Swal.fire('ลบสำเร็จ', data.message || 'ข้อมูลถูกลบเรียบร้อย', 'success');
            await loadStudents(true);
            return true;
        } else {
            throw new Error(data.message || 'ลบข้อมูลล้มเหลว');
        }
    } catch (error) {
        console.error('ลบข้อมูลล้มเหลว:', error);
        if (showAlert) Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้: ' + error.message, 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

// ==================== Batch Operations ====================

async function batchImportStudents(newStudents) {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้นที่สามารถนำเข้าข้อมูลได้', 'warning');
        return false;
    }
    
    try {
        showLoading(true);
        
        if (USE_LOCAL_STORAGE) {
            students.push(...newStudents);
            localStorage.setItem('ltc_students', JSON.stringify(students));
            await loadStudents(true);
            return true;
        } else {
            const url = getGASUrl();
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'batchImport', students: newStudents }),
                mode: 'cors'
            });
            
            const result = await response.json();
            if (result.success) {
                await loadStudents(true);
                return true;
            } else {
                throw new Error(result.message);
            }
        }
    } catch (error) {
        console.error('นำเข้าข้อมูลล้มเหลว:', error);
        Swal.fire('ผิดพลาด', 'ไม่สามารถนำเข้าข้อมูลได้: ' + error.message, 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

async function batchUpdateStudents(updates) {
    if (currentUser.role !== 'admin') {
        Swal.fire('ไม่ได้รับอนุญาต', 'เฉพาะแอดมินเท่านั้น', 'warning');
        return false;
    }
    
    try {
        showLoading(true);
        
        const url = getGASUrl();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'batchUpdate',
                updates: updates
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            Swal.fire('สำเร็จ', result.message, 'success');
            await loadStudents(true);
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Batch update error:', error);
        Swal.fire('ผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้: ' + error.message, 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

async function batchUpdateStatus(studentIds, newStatus) {
    const updates = studentIds.map(id => ({
        id: id,
        status: newStatus
    }));
    
    const confirm = await Swal.fire({
        title: 'ยืนยันการเปลี่ยนสถานะ',
        text: `คุณต้องการเปลี่ยนสถานะ ${studentIds.length} รายการ เป็น "${newStatus}" ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    });
    
    if (confirm.isConfirmed) {
        return batchUpdateStudents(updates);
    }
    return false;
}

function getSelectedStudentIds() {
    const checkboxes = document.querySelectorAll('.studentCheckbox:checked');
    return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
}

function showBulkActions() {
    const selectedIds = getSelectedStudentIds();
    if (selectedIds.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกนักศึกษาอย่างน้อย 1 คน', 'warning');
        return;
    }
    
    Swal.fire({
        title: 'จัดการข้อมูลกลุ่ม',
        html: `
            <div style="text-align:left;">
                <p>เลือก ${selectedIds.length} รายการ</p>
                <select id="bulkActionSelect" class="swal2-select" style="width:100%; padding:8px; margin:10px 0;">
                    <option value="">-- เลือกการกระทำ --</option>
                    <option value="status_active">เปลี่ยนสถานะเป็น "กำลังศึกษา"</option>
                    <option value="status_graduated">เปลี่ยนสถานะเป็น "จบการศึกษา"</option>
                    <option value="status_suspended">เปลี่ยนสถานะเป็น "พักการเรียน"</option>
                    <option value="status_dropped">เปลี่ยนสถานะเป็น "ลาออก"</option>
                    <option value="delete">ลบข้อมูล (${selectedIds.length} รายการ)</option>
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'ดำเนินการ',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const action = document.getElementById('bulkActionSelect').value;
            if (!action) {
                Swal.showValidationMessage('กรุณาเลือกการกระทำ');
                return false;
            }
            return action;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const action = result.value;
            
            if (action === 'delete') {
                const confirm = await Swal.fire({
                    title: 'ยืนยันการลบกลุ่ม',
                    text: `คุณต้องการลบ ${selectedIds.length} รายการ ใช่หรือไม่?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#f44336',
                    confirmButtonText: 'ลบทั้งหมด',
                    cancelButtonText: 'ยกเลิก'
                });
                
                if (confirm.isConfirmed) {
                    let successCount = 0;
                    for (const id of selectedIds) {
                        const success = await deleteStudent(id, false);
                        if (success) successCount++;
                    }
                    await loadStudents(true);
                    Swal.fire('สำเร็จ', `ลบข้อมูล ${successCount} จาก ${selectedIds.length} รายการ`, 'success');
                }
            } else if (action.startsWith('status_')) {
                const statusMap = {
                    'status_active': 'กำลังศึกษา',
                    'status_graduated': 'จบการศึกษา',
                    'status_suspended': 'พักการเรียน',
                    'status_dropped': 'ลาออก'
                };
                await batchUpdateStatus(selectedIds, statusMap[action]);
            }
        }
    });
}

// ==================== ฟังก์ชันค้นหาแบบ Real-time ====================

function setupSearchDebounce() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (e.target.value.length >= 2 || e.target.value.length === 0) {
                    loadStudents(true);
                }
            }, 500);
        });
    }
}

async function quickSearch(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    try {
        const url = getGASUrl();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'quickSearch',
                search: searchTerm,
                limit: 20
            })
        });
        
        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error('Quick search error:', error);
        return [];
    }
}

// ==================== การแสดงผล ====================

function renderTable() {
    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;
    
    const isAdmin = currentUser.role === 'admin';
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">📭 ไม่พบข้อมูล</td></tr>';
        return;
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    
    tbody.innerHTML = students.map((student, idx) => {
        let statusClass = '';
        if (student.status === 'กำลังศึกษา') statusClass = 'status-active';
        else if (student.status === 'จบการศึกษา') statusClass = 'status-graduated';
        else statusClass = 'status-inactive';
        
        const actionButtons = isAdmin ? `
            <td class="action-buttons">
                <button class="btn btn-secondary" onclick="editStudent('${student.id}')" title="แก้ไข">✏️</button>
                <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" title="ลบ">🗑️</button>
            </td>
        ` : '<td>-</td>';
        
        return `
            <tr>
                <td style="text-align:center">
                    <input type="checkbox" class="studentCheckbox" data-id="${student.id}" ${!isAdmin ? 'disabled' : ''}>
                </td>
                <td style="text-align:center">${startIndex + idx + 1}</td>
                <td><strong>${escapeHtml(student.code) || '-'}</strong></td>
                <td>${escapeHtml(student.prefix || '')}${escapeHtml(student.firstname || '')} ${escapeHtml(student.lastname || '')}</td>
                <td style="text-align:center">${student.level || '-'}</td>
                <td style="text-align:center">${student.room || '-'}</td>
                <td>${student.major || '-'}</td>
                <td style="text-align:center">${student.serial || '-'}</td>
                <td style="text-align:center"><span class="status-badge ${statusClass}">${student.status || '-'}</span></td>
                ${actionButtons}
            </tr>
        `;
    }).join('');
    
    // อัปเดต checkbox select all
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checkboxes = document.querySelectorAll('.studentCheckbox');
        selectAll.checked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function updateStats() {
    const total = totalStudents || students.length;
    const active = students.filter(s => s.status === 'กำลังศึกษา').length;
    const graduated = students.filter(s => s.status === 'จบการศึกษา').length;
    
    const totalCountEl = document.getElementById('totalCount');
    const activeCountEl = document.getElementById('activeCount');
    const graduatedCountEl = document.getElementById('graduatedCount');
    
    if (totalCountEl) totalCountEl.textContent = total;
    if (activeCountEl) activeCountEl.textContent = active;
    if (graduatedCountEl) graduatedCountEl.textContent = graduated;
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
                    
                    await batchImportStudents(newStudents);
                    Swal.fire('สำเร็จ', `นำเข้าข้อมูล ${newStudents.length} รายการ`, 'success');
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

async function exportLargeData() {
    Swal.fire({
        title: 'กำลังส่งออกข้อมูล',
        text: 'กรุณารอสักครู่...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    try {
        const url = getGASUrl();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'exportLargeData' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const exportData = result.data.map((s, idx) => ({
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
            
            if (exportData.length > 5000) {
                const chunks = [];
                for (let i = 0; i < exportData.length; i += 5000) {
                    chunks.push(exportData.slice(i, i + 5000));
                }
                
                Swal.fire({
                    title: `ส่งออกข้อมูล ${exportData.length} รายการ`,
                    html: `ข้อมูลมีจำนวนมาก จะแบ่งเป็น ${chunks.length} ไฟล์<br>ต้องการดำเนินการต่อหรือไม่?`,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'ดำเนินการ'
                }).then((result) => {
                    if (result.isConfirmed) {
                        chunks.forEach((chunk, index) => {
                            const ws = XLSX.utils.json_to_sheet(chunk);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, `นักศึกษา_ส่วนที่_${index + 1}`);
                            XLSX.writeFile(wb, `รายชื่อนักศึกษา_LTC_ส่วน${index + 1}_${new Date().toLocaleDateString('th-TH')}.xlsx`);
                        });
                        Swal.fire('สำเร็จ', `ส่งออกข้อมูล ${exportData.length} รายการ เป็น ${chunks.length} ไฟล์`, 'success');
                    }
                });
            } else {
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักศึกษา');
                XLSX.writeFile(wb, `รายชื่อนักศึกษา_LTC_${new Date().toLocaleDateString('th-TH')}.xlsx`);
                Swal.fire('สำเร็จ', `ส่งออกข้อมูล ${exportData.length} รายการ`, 'success');
            }
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Export error:', error);
        Swal.fire('ผิดพลาด', 'ไม่สามารถส่งออกข้อมูลได้', 'error');
    } finally {
        Swal.close();
    }
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
                .signature-col { text-align: center; font-size: 10px; }
                .footer { margin-top: 15px; text-align: right; font-size: 12px; }
                .signature { margin-top: 20px; display: flex; justify-content: space-between; }
                .signature div { text-align: center; width: 200px; font-size: 13px; }
                .signature-line { margin-top: 30px; border-top: 1px solid #000; width: 100%; }
                @media print {
                    body { padding: 0; margin: 0.5cm; }
                    table { page-break-inside: avoid; }
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

function loadSampleData() {
    students = [
        { id: '1', code: '69301040060', prefix: 'นาย', firstname: 'ธนพล', lastname: 'ลัดดาแย้ม', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0812345678', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '2', code: '69301040061', prefix: 'นาย', firstname: 'รณกร', lastname: 'วิพัฒนกำจร', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0823456789', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '3', code: '69301040083', prefix: 'นาย', firstname: 'กิตติธัช', lastname: 'มาเสริฐ', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0834567890', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '4', code: '69301040095', prefix: 'นาย', firstname: 'วัชระพงษ์', lastname: 'สมสะกิจ', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0845678901', status: 'กำลังศึกษา', created_at: new Date().toISOString() },
        { id: '5', code: '69301040096', prefix: 'นาย', firstname: 'ภูรี', lastname: 'ราชอาด', level: 'ปวส.1', room: '1/6', major: 'ไฟฟ้ากำลัง', serial: 'บ่าย', phone: '0856789012', status: 'กำลังศึกษา', created_at: new Date().toISOString() }
    ];
    
    totalStudents = students.length;
    totalPages = Math.ceil(totalStudents / pageSize);
    
    if (USE_LOCAL_STORAGE) {
        localStorage.setItem('ltc_students', JSON.stringify(students));
    }
    renderTable();
    updateStats();
    updatePaginationControls();
}

function showLoading(show) {
    const tbody = document.getElementById('studentTableBody');
    if (show && (!students || students.length === 0) && tbody) {
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
    const levelFilter = document.getElementById('filterLevel');
    const majorFilter = document.getElementById('filterMajor');
    const serialFilter = document.getElementById('filterSerial');
    const searchInput = document.getElementById('searchInput');
    
    if (levelFilter) levelFilter.value = '';
    if (majorFilter) majorFilter.value = '';
    if (serialFilter) serialFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    currentPage = 1;
    loadStudents(true);
}

// ==================== Event Listeners ====================

document.addEventListener('DOMContentLoaded', () => {
    // ตรวจสอบ URL ที่บันทึกไว้
    const savedUrl = localStorage.getItem('ltc_gas_url');
    if (savedUrl && savedUrl.includes('script.google.com')) {
        GAS_URL = savedUrl;
    }
    
    if (!checkAuth()) return;
    
    loadStudents();
    setupSearchDebounce();
    
    // ปุ่มต่างๆ
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.onclick = openModal;
    
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.onclick = closeModal;
    
    document.querySelectorAll('.cancelBtn').forEach(btn => btn.onclick = closeModal);
    
    window.onclick = (e) => {
        const modal = document.getElementById('studentModal');
        if (e.target === modal) closeModal();
    };
    
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.onsubmit = (e) => {
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
    }
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.onclick = () => loadStudents(true);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.onclick = resetFilters;
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.onclick = () => loadStudents(true);
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.onclick = exportToExcel;
    
    const printBtn = document.getElementById('printBtn');
    if (printBtn) printBtn.onclick = printToPDF;
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = logout;
    
    // ปุ่ม Bulk Actions
    const bulkActionBtn = document.createElement('button');
    bulkActionBtn.id = 'bulkActionBtn';
    bulkActionBtn.className = 'btn btn-info admin-only';
    bulkActionBtn.innerHTML = '📦 จัดการกลุ่ม';
    bulkActionBtn.onclick = showBulkActions;
    
    // ปุ่มส่งออกทั้งหมด
    const exportLargeBtn = document.createElement('button');
    exportLargeBtn.id = 'exportLargeBtn';
    exportLargeBtn.className = 'btn btn-warning';
    exportLargeBtn.innerHTML = '📊 ส่งออกทั้งหมด';
    exportLargeBtn.onclick = exportLargeData;
    
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.onclick = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx, .xls, .csv';
                input.onchange = (e) => {
                    if (e.target.files[0]) importExcel(e.target.files[0]);
                };
                input.click();
            };
        }
        
        toolbar.appendChild(bulkActionBtn);
        toolbar.appendChild(exportLargeBtn);
    }
    
    // Select All checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.onchange = (e) => {
            if (currentUser.role === 'admin') {
                document.querySelectorAll('.studentCheckbox').forEach(cb => cb.checked = e.target.checked);
            }
        };
    }
    
    // Filter change events
    const filterLevel = document.getElementById('filterLevel');
    const filterMajor = document.getElementById('filterMajor');
    const filterSerial = document.getElementById('filterSerial');
    
    if (filterLevel) filterLevel.onchange = () => loadStudents(true);
    if (filterMajor) filterMajor.onchange = () => loadStudents(true);
    if (filterSerial) filterSerial.onchange = () => loadStudents(true);
    
    // Search enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadStudents(true);
        });
    }
});
