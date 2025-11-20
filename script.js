import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc, setDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// --- CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyCpOw2nHuxHpKfkDxZzAe4nyqXrmhZZbSM",
    authDomain: "galeri-promp-saya.firebaseapp.com",
    projectId: "galeri-promp-saya",
    storageBucket: "galeri-promp-saya.firebasestorage.app",
    messagingSenderId: "963487890074",
    appId: "1:963487890074:web:9140f140b018503380bd23"
};
const appId = 'galeri-saya-app';
const SUPER_USER_EMAIL = 'akmalhamsani@gmail.com';

// --- STATE ---
let db, auth, storage, galleryRef, categoriesRef;
let allItems = [], currentUserId = null, isSuperUser = false;
let currentView = 'gallery', currentCategory = 'all', currentUserIdFilter = null;
let modalItems = [], currentModalIndex = -1, touchstartX = 0;
let commentsUnsubscribe = null;
let replyUnsubscribes = {};
let profileUserId = null; 
let isInitialLoad = true; 

// --- ELEMENTS ---
const els = {
    loginBtn: document.getElementById('login-btn'),
    userControls: document.getElementById('user-controls'),
    userWelcome: document.getElementById('user-welcome'),
    logoutBtn: document.getElementById('logout-btn'),
    toggleFormBtn: document.getElementById('toggle-form-btn'),
    addFormContainer: document.getElementById('add-form-container'),
    addForm: document.getElementById('add-form'),
    submitBtn: document.getElementById('submit-button'),
    gallery: document.getElementById('gallery-container'),
    mainControls: document.getElementById('main-controls-bar'),
    catTabs: document.getElementById('category-tabs'),
    userFilterChip: document.getElementById('user-filter-chip'),
    userFilterName: document.getElementById('user-filter-name'),
    catSelect: document.getElementById('category-select'),
    viewTitle: document.getElementById('current-view-title'),
    approveAllBtn: document.getElementById('approve-all-btn'),
    approveAllCount: document.getElementById('approve-all-count'),
    imageFile: document.getElementById('image-file'),
    mobileMenuBtn: document.getElementById('mobile-menu-toggle'),
    mobileSidebar: document.getElementById('mobile-sidebar'),
    mobileBackdrop: document.getElementById('mobile-backdrop'),
    mobileAddBtn: document.getElementById('mobile-add-btn'),
    mobileLoginBtn: document.getElementById('mobile-login-btn'),
    mobileUserInfo: document.getElementById('mobile-user-info'),
    mobileUsername: document.getElementById('mobile-username'),
    mobileLogoutBtn: document.getElementById('mobile-logout-btn'),
    mobileUserLinks: document.getElementById('mobile-user-links'),
    mobilePendingCount: document.getElementById('mobile-pending-count'),
    mobileRequestCount: document.getElementById('mobile-request-count'),
    mobileNavRequest: document.getElementById('mobile-nav-request'),
    mobileNavMyProfile: document.getElementById('mobile-nav-myprofile'),
    mobileNavGallery: document.getElementById('mobile-nav-gallery'),
    mobileNavLiked: document.getElementById('mobile-nav-liked'),
    mobileNavPending: document.getElementById('mobile-nav-pending'),
    profileViewContainer: document.getElementById('profile-view-container'),
    profileImg: document.getElementById('profile-img'),
    profileName: document.getElementById('profile-name'),
    profileBio: document.getElementById('profile-bio'),
    editBioBtn: document.getElementById('edit-bio-btn'),
    bioEditForm: document.getElementById('bio-edit-form'),
    bioInput: document.getElementById('bio-input'),
    profileGalleryGrid: document.getElementById('profile-gallery-grid'),
    modal: document.getElementById('view-modal'),
    modalImg: document.getElementById('modal-img'),
    modalPrompt: document.getElementById('modal-prompt'),
    modalCategory: document.getElementById('modal-category'),
    modalUploader: document.getElementById('modal-uploader'),
    modalCopyBtn: document.getElementById('modal-copy-btn'),
    modalShareBtn: document.getElementById('modal-share-btn'),
    modalLikeBtn: document.getElementById('modal-like-btn'),
    modalHeartIcon: document.getElementById('modal-heart-icon'),
    modalLikeCount: document.getElementById('modal-like-count'),
    commentsList: document.getElementById('comments-list'),
    commentCount: document.getElementById('comment-count'),
    commentInput: document.getElementById('comment-input'),
    commentInputArea: document.getElementById('comment-input-area'),
    loginToComment: document.getElementById('login-to-comment'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    prevBtn: document.getElementById('prev-modal-btn'),
    nextBtn: document.getElementById('next-modal-btn'),
    modalImageArea: document.getElementById('modal-image-area'),
    modalMobileScrollContainer: document.getElementById('modal-mobile-scroll-container'),
    modalTextContent: document.getElementById('modal-text-content'),
    sizeSlider: document.getElementById('size-slider'),
    notif: document.getElementById('notification'),
    notifMsg: document.getElementById('notif-msg'),
    notifIcon: document.getElementById('notif-icon'),
    navs: { 
        gallery: document.getElementById('nav-gallery'), 
        liked: document.getElementById('nav-liked'), 
        myprofile: document.getElementById('nav-myprofile'),
        myprompt: document.getElementById('nav-myprompt'), 
        pending: document.getElementById('nav-pending'), 
        request: document.getElementById('nav-request') 
    },
    counts: { pending: document.getElementById('pending-count-user'), request: document.getElementById('request-count-admin') }
};

// --- HELPERS ---
els.sizeSlider.addEventListener('input', (e) => document.documentElement.style.setProperty('--img-height', `${e.target.value}px`));

function notify(msg, type='success') { 
    els.notifMsg.textContent = msg; 
    els.notifIcon.textContent = type==='error'?'⚠️':(msg.includes('komen')?'💬':(msg.includes('Like')?'❤️':(msg.includes('balas')?'↩️':'🔔'))); 
    els.notif.className = `fixed bottom-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg text-sm font-medium z-[200] flex items-center gap-2 transition-all duration-300 transform translate-y-0 opacity-100 ${type === 'error' ? 'bg-red-600' : 'bg-gray-800'} text-white`; 
    els.notif.classList.remove('hidden'); 
    setTimeout(() => { els.notif.classList.add('translate-y-10', 'opacity-0'); setTimeout(()=>els.notif.classList.add('hidden'), 300); }, 3000); 
}

function copyToClipboard(text) { 
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); 
    try { document.execCommand('copy'); notify('Promp disalin!'); } catch (e) {} document.body.removeChild(t); 
}

function updateUrlState(params) { 
    try { 
        const url = new URL(window.location); 
        if (params.view) url.searchParams.set('view', params.view); 
        if (params.id) url.searchParams.set('id', params.id); 
        else url.searchParams.delete('id'); 
        window.history.pushState({}, '', url); 
    } catch (e) {} 
}

function scrollToBottomComments() { 
    setTimeout(() => { 
        if (window.innerWidth < 768) els.modalMobileScrollContainer.scrollTop = els.modalMobileScrollContainer.scrollHeight; 
        else els.modalTextContent.scrollTop = els.modalTextContent.scrollHeight; 
    }, 200); 
}

function updateCounts() { 
    if(currentUserId){ 
        const pendingUser = allItems.filter(i => i.userId === currentUserId && i.status === 'pending').length; 
        if(pendingUser > 0) { 
            els.counts.pending.textContent = pendingUser; 
            els.counts.pending.classList.remove('hidden'); 
            if(els.mobilePendingCount) { els.mobilePendingCount.textContent = pendingUser; els.mobilePendingCount.classList.remove('hidden'); }
        } else { 
            els.counts.pending.classList.add('hidden'); 
            if(els.mobilePendingCount) els.mobilePendingCount.classList.add('hidden'); 
        } 
    } 
    const pendingAll = allItems.filter(i => i.status === 'pending').length; 
    if(pendingAll > 0) { 
        els.counts.request.textContent = pendingAll; 
        els.counts.request.classList.remove('hidden'); 
        if(els.mobileRequestCount) { els.mobileRequestCount.textContent = pendingAll; els.mobileRequestCount.classList.remove('hidden'); }
        if(els.mobileNavRequest) els.mobileNavRequest.classList.remove('hidden'); 
    } else { 
        els.counts.request.classList.add('hidden'); 
        if(els.mobileRequestCount) els.mobileRequestCount.classList.add('hidden'); 
        if(els.mobileNavRequest) els.mobileNavRequest.classList.add('hidden'); 
    } 
}

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const maxWidth = 1280; const maxHeight = 1280; const quality = 0.7;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width; let height = img.height;
                if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
                else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error("Gagal kompres")); }, 'image/webp', quality);
            }; img.onerror = (err) => reject(err);
        }; reader.onerror = (err) => reject(err);
    });
}

// --- UI HELPERS ---
function updateMobileMenuUI(user) {
    if(user) { 
        els.mobileLoginBtn.classList.add('hidden'); 
        els.mobileUserInfo.classList.remove('hidden'); 
        els.mobileUsername.textContent = user.displayName; 
        els.mobileUserLinks.classList.remove('hidden'); 
        els.mobileAddBtn.classList.remove('hidden'); 
    } else { 
        els.mobileLoginBtn.classList.remove('hidden'); 
        els.mobileUserInfo.classList.add('hidden'); 
        els.mobileUserLinks.classList.add('hidden'); 
        els.mobileAddBtn.classList.add('hidden'); 
    }
}

function updateMobileActiveState(viewName) {
    const btns = [els.mobileNavGallery, els.mobileNavMyProfile, els.mobileNavLiked, els.mobileNavPending, els.mobileNavRequest];
    btns.forEach(b => { if(b) b.classList.remove('active'); });
    if(viewName === 'gallery' && els.mobileNavGallery) els.mobileNavGallery.classList.add('active');
    else if(viewName === 'profile' && els.mobileNavMyProfile) els.mobileNavMyProfile.classList.add('active');
    else if(viewName === 'liked' && els.mobileNavLiked) els.mobileNavLiked.classList.add('active');
    else if(viewName === 'pending' && els.mobileNavPending) els.mobileNavPending.classList.add('active');
    else if(viewName === 'request' && els.mobileNavRequest) els.mobileNavRequest.classList.add('active');
}

// --- GLOBAL FUNCTIONS (Attached to Window) ---
// Ini sangat penting supaya HTML onclick boleh baca fungsi-fungsi ini

window.addItem = async (e) => {
    e.preventDefault();
    if (!currentUserId) return notify("Sila log masuk.", 'error');
    const file = els.imageFile.files[0];
    if (!file) return notify("Sila pilih gambar!", 'error');
    const prompt = document.getElementById('image-prompt').value.trim();
    const category = els.catSelect.value || document.getElementById('new-category').value.trim() || 'Umum';
    els.submitBtn.disabled = true; els.submitBtn.innerText = "Sedang Upload...";
    const user = auth.currentUser;
    try {
        const compressedBlob = await compressImage(file);
        const fileName = `${currentUserId}_${Date.now()}.webp`;
        const storageRef = ref(storage, 'images/' + fileName);
        await uploadBytes(storageRef, compressedBlob);
        const downloadURL = await getDownloadURL(storageRef);
        const newItem = { imageUrl: downloadURL, prompt: prompt, category: category, timestamp: Date.now(), userId: currentUserId, userName: (user.displayName || 'User').split(' ')[0], status: 'pending', likes: [] };
        if (document.getElementById('new-category').value.trim()) { setDoc(doc(db, categoriesRef.path, newItem.category), { name: newItem.category }).catch(console.error); }
        await addDoc(galleryRef, newItem);
        els.addForm.reset(); els.imageFile.value = ""; els.toggleFormBtn.click(); 
        notify("Berjaya upload! Menunggu kelulusan."); window.switchView('pending');
    } catch (err) { console.error("Upload error:", err); notify("Gagal upload: " + err.message, 'error'); } 
    finally { els.submitBtn.disabled = false; els.submitBtn.innerText = "Hantar untuk Approval"; }
};

window.toggleMobileMenu = () => {
    const sidebar = els.mobileSidebar; const backdrop = els.mobileBackdrop; const isClosed = sidebar.classList.contains('translate-x-full');
    if (isClosed) { sidebar.classList.remove('translate-x-full'); sidebar.classList.add('translate-x-0'); backdrop.classList.remove('hidden'); setTimeout(() => backdrop.classList.remove('opacity-0'), 10); } 
    else { sidebar.classList.remove('translate-x-0'); sidebar.classList.add('translate-x-full'); backdrop.classList.add('opacity-0'); setTimeout(() => backdrop.classList.add('hidden'), 300); }
};
window.toggleAddForm = () => { els.addFormContainer.classList.toggle('hidden'); if (!els.mobileSidebar.classList.contains('translate-x-full')) window.toggleMobileMenu(); };

window.switchView = function(viewName) {
    currentView = viewName; updateUrlState({ view: viewName }); profileUserId = null;
    els.gallery.classList.remove('hidden'); els.mainControls.classList.remove('hidden'); els.addFormContainer.classList.add('hidden'); els.viewTitle.classList.remove('hidden'); els.profileViewContainer.classList.add('hidden'); 
    Object.values(els.navs).forEach(btn => btn.classList.remove('active')); if(els.navs[viewName]) els.navs[viewName].classList.add('active');
    updateMobileActiveState(viewName);
    const titles = { gallery: "Galeri Awam", liked: "Promp Yang Saya Like ❤️", myprompt: "Koleksi Saya", pending: "Pending Approval", request: "Permintaan Approval (Admin)" };
    els.viewTitle.textContent = titles[viewName]; if (viewName === 'request' && isSuperUser) els.approveAllBtn.classList.remove('hidden'); else els.approveAllBtn.classList.add('hidden');
    renderGallery();
}

window.showUserProfile = async (uid) => {
    if(!uid) return; profileUserId = uid; currentView = 'profile'; updateUrlState({ view: 'profile' });
    els.gallery.classList.add('hidden'); els.mainControls.classList.add('hidden'); els.addFormContainer.classList.add('hidden'); els.viewTitle.classList.add('hidden'); els.profileViewContainer.classList.remove('hidden');
    Object.values(els.navs).forEach(btn => btn.classList.remove('active')); updateMobileActiveState('profile');
    els.profileName.textContent = "Memuatkan..."; els.profileBio.textContent = ""; els.profileImg.src = "https://placehold.co/150x150?text=Loading";
    try { const userDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/users`, uid)); if (userDoc.exists()) { const data = userDoc.data(); els.profileName.textContent = data.displayName || 'Pengguna'; els.profileImg.src = data.photoURL || "https://placehold.co/150x150?text=User"; els.profileBio.textContent = data.bio || "Pengguna ini belum menulis bio."; } else { const someItem = allItems.find(i => i.userId === uid); els.profileName.textContent = someItem ? someItem.userName : 'Pengguna'; els.profileImg.src = "https://placehold.co/150x150?text=User"; els.profileBio.textContent = "Tiada bio."; } } catch (e) { console.error("Error loading profile", e); }
    if (currentUserId && currentUserId === uid) { els.editBioBtn.classList.remove('hidden'); } else { els.editBioBtn.classList.add('hidden'); els.bioEditForm.classList.add('hidden'); }
    renderProfileGallery(uid); window.closeModal();
};

window.toggleBioEdit = () => { const form = els.bioEditForm; if (form.classList.contains('hidden')) { form.classList.remove('hidden'); els.bioInput.value = els.profileBio.textContent === "Pengguna ini belum menulis bio." || els.profileBio.textContent === "Tiada bio." ? "" : els.profileBio.textContent; els.bioInput.focus(); } else { form.classList.add('hidden'); } };
window.saveBio = async () => { if (!currentUserId) return; const newBio = els.bioInput.value.trim(); try { const userRef = doc(db, `artifacts/${appId}/public/data/users`, currentUserId); await updateDoc(userRef, { bio: newBio }); els.profileBio.textContent = newBio || "Tiada bio."; window.toggleBioEdit(); notify("Bio dikemas kini!", 'success'); } catch (e) { console.error("Error saving bio", e); notify("Gagal simpan bio.", 'error'); } };
window.filterByCategory = (cat) => { currentCategory = cat; Array.from(els.catTabs.children).forEach(btn => { const btnCat = btn.textContent === 'Semua' ? 'all' : btn.textContent; btn.className = btnCat === cat ? 'px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border bg-blue-600 text-white border-blue-600' : 'px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border bg-white text-gray-600 border-gray-300 hover:bg-gray-50'; if(btnCat === cat) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }); renderGallery(); };
window.filterByUser = (uid, name) => { currentUserIdFilter = uid; els.userFilterName.textContent = name || 'User'; els.userFilterChip.classList.remove('hidden'); renderGallery(); };
window.clearUserFilter = () => { currentUserIdFilter = null; els.userFilterChip.classList.add('hidden'); renderGallery(); };
window.deleteItem = async (id) => { if(confirm("Padam item ini?")) try { await deleteDoc(doc(db, galleryRef.path, id)); notify("Item dipadam."); } catch(err) { notify("Gagal memadam.", 'error'); } };
window.approveItem = async (id) => { try { await updateDoc(doc(db, galleryRef.path, id), { status: 'approved' }); notify("Item diluluskan!"); } catch(err) { notify("Gagal approve.", 'error'); } };
window.approveAll = async () => { if(!confirm("Luluskan semua?")) return; const batch = writeBatch(db); allItems.filter(i => i.status === 'pending').forEach(i => batch.update(doc(db, galleryRef.path, i.id), { status: 'approved' })); try { await batch.commit(); notify("Semua diluluskan!"); } catch(err) { notify("Gagal.", 'error'); } };
window.shareItem = async (itemId) => { const item = allItems.find(i => i.id === itemId); if (!item) return; let shareUrl = window.location.href; try { const url = new URL(window.location.origin + window.location.pathname); url.searchParams.set('view', 'gallery'); url.searchParams.set('id', itemId); shareUrl = url.toString(); } catch (e) {} const shareData = { title: 'Galeri Promp', text: `Lihat promp menarik ini: "${item.prompt}"`, url: shareUrl }; if (navigator.share) { try { await navigator.share(shareData); } catch (err) {} } else { copyToClipboard(shareUrl); notify('Pautan gambar disalin!', 'success'); } };
window.toggleLike = async (itemId, ownerId) => { if (!currentUserId) return notify("Sila log masuk untuk like.", 'error'); const item = allItems.find(i => i.id === itemId); if(!item) return; const isLiked = item.likes && item.likes.includes(currentUserId); const itemRef = doc(db, galleryRef.path, itemId); try { if (isLiked) await updateDoc(itemRef, { likes: arrayRemove(currentUserId) }); else { await updateDoc(itemRef, { likes: arrayUnion(currentUserId) }); notify("Liked!", 'success'); if (ownerId && ownerId !== currentUserId) { const notifRef = collection(db, `/artifacts/${appId}/public/data/users/${ownerId}/notifications`); const user = auth.currentUser; addDoc(notifRef, { type: 'like', fromName: user.displayName || 'Seseorang', itemId: itemId, promptSnippet: item.prompt.substring(0, 20) + '...', timestamp: Date.now(), read: false }).catch(console.error); } } } catch (err) { console.error(err); notify("Gagal like.", 'error'); } };

// --- GALLERY RENDERER ---
function renderProfileGallery(uid) {
    const userItems = allItems.filter(i => i.userId === uid && (i.status === 'approved' || !i.status || (currentUserId === uid)));
    els.profileGalleryGrid.innerHTML = ''; 
    if (userItems.length === 0) { els.profileGalleryGrid.innerHTML = '<p class="text-gray-400 w-full text-center py-8">Tiada gambar diupload.</p>'; return; }
    userItems.forEach(item => { const div = document.createElement('div'); div.className = 'relative group overflow-hidden rounded-lg cursor-pointer h-40 w-40 md:h-48 md:w-48 bg-gray-200'; div.onclick = () => window.openModal(item.id); div.innerHTML = `<img src="${item.imageUrl}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"><div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>`; els.profileGalleryGrid.appendChild(div); });
}

function renderGallery() {
    if(currentView === 'profile') return;
    let filtered = allItems.filter(item => { const itemCat = item.category || 'Umum'; return (currentCategory === 'all' || itemCat === currentCategory) && (!currentUserIdFilter || item.userId === currentUserIdFilter); });
    let itemsToShow = [];
    if (currentView === 'gallery') itemsToShow = filtered.filter(item => item.status === 'approved' || !item.status);
    else if (currentView === 'liked') itemsToShow = filtered.filter(item => (item.status === 'approved' || !item.status) && item.likes && item.likes.includes(currentUserId));
    else if (currentView === 'myprompt') itemsToShow = filtered.filter(item => item.userId === currentUserId);
    else if (currentView === 'pending') itemsToShow = filtered.filter(item => item.userId === currentUserId && item.status === 'pending');
    else if (currentView === 'request') itemsToShow = filtered.filter(item => item.status === 'pending');
    if(currentView === 'request') els.approveAllCount.textContent = itemsToShow.length;
    els.gallery.innerHTML = ''; if (itemsToShow.length === 0) { els.gallery.innerHTML = `<p class="text-gray-500 w-full text-center py-10">Tiada item dijumpai.</p>`; return; }
    itemsToShow.forEach(item => {
        const card = document.createElement('div');
        card.className = 'gallery-item group bg-white rounded-lg shadow-md cursor-pointer relative flex-grow hover:shadow-xl transition-shadow select-none overflow-hidden';
        const isOwner = currentUserId && item.userId === currentUserId;
        const isPending = item.status === 'pending';
        const canDelete = isOwner || isSuperUser;
        const likes = item.likes || []; const isLikedByMe = currentUserId && likes.includes(currentUserId); const heartColor = isLikedByMe ? 'text-red-500' : 'text-white'; const heartFill = isLikedByMe ? 'currentColor' : 'none';
        const deleteBtn = canDelete ? `<button onclick="event.stopPropagation(); window.deleteItem('${item.id}')" class="delete-btn absolute top-10 right-1 z-20 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm hover:bg-red-700" title="Padam">&times;</button>` : '';
        let approveBtn = (isSuperUser && isPending && currentView === 'request') ? `<button onclick="event.stopPropagation(); window.approveItem('${item.id}')" class="approve-btn absolute top-1 left-1 z-20 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-green-700 flex items-center gap-1">✓ Approve</button>` : '';
        let statusBadge = (!isSuperUser && (currentView === 'myprompt' || currentView === 'pending')) ? `<span class="absolute top-1 left-1 z-10 ${isPending?'bg-yellow-500':'bg-green-500'} text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm uppercase font-bold tracking-wider opacity-90">${isPending?'Pending':'Approved'}</span>` : '';
        const viewBtn = `<button onclick="event.stopPropagation(); window.openModal('${item.id}')" class="view-btn absolute bottom-2 right-2 z-20 bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black backdrop-blur-sm" title="Lihat Penuh"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>`;
        card.onclick = (e) => { if (!e.target.closest('button') && !e.target.closest('span[onclick]')) copyToClipboard(item.prompt); };
        card.innerHTML = `<div class="relative overflow-hidden w-full h-full"><div class="absolute top-0 left-0 right-0 p-2 bg-black/50 flex justify-between items-center gap-2 z-10"><span onclick="event.stopPropagation(); window.filterByCategory('${item.category || 'Umum'}')" class="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase tracking-wide truncate max-w-[120px] cursor-pointer hover:bg-blue-200 transition-colors">${item.category || 'Umum'}</span><span onclick="event.stopPropagation(); window.showUserProfile('${item.userId}')" class="text-[10px] text-white/90 truncate cursor-pointer hover:text-purple-300 hover:underline">By: ${item.userName || 'User'}</span></div>${deleteBtn} ${approveBtn} ${statusBadge} ${viewBtn}<img src="${item.imageUrl}" class="dynamic-img w-auto min-w-full object-cover block transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://placehold.co/600x400?text=Error'"><div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10 flex items-end justify-between gap-2"><div class="pointer-events-auto"><button onclick="event.stopPropagation(); window.toggleLike('${item.id}', '${item.userId}'); this.firstElementChild.classList.add('like-anim'); setTimeout(()=>this.firstElementChild.classList.remove('like-anim'),400);" class="flex items-center gap-1 text-white hover:scale-110 transition-transform bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm"><svg class="w-5 h-5 ${heartColor} transition-colors duration-300" fill="${heartFill}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg><span class="text-xs font-bold">${likes.length}</span></button><button onclick="event.stopPropagation(); window.shareItem('${item.id}')" class="flex items-center gap-1 text-white hover:scale-110 transition-transform bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm ml-2"><svg class="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg></button></div><p class="text-sm text-white line-clamp-1 font-medium text-right flex-1 opacity-90">${item.prompt}</p></div></div>`; els.gallery.appendChild(card); }); for(let i=0; i<8; i++) els.gallery.appendChild(document.createElement('div')).className = 'flex-grow h-0 p-0 m-0 opacity-0 border-0';
}

function updateModalContent(index) { 
    if (index < 0 || index >= modalItems.length) return; 
    const item = modalItems[index]; currentModalIndex = index; 
    els.modalImg.src = item.imageUrl; els.modalPrompt.textContent = item.prompt; els.modalCategory.textContent = item.category || 'Umum'; 
    els.modalUploader.innerHTML = `By: <span class="cursor-pointer hover:underline" onclick="window.showUserProfile('${item.userId}')">${item.userName || 'User'}</span>`; 
    els.modalCopyBtn.onclick = () => copyToClipboard(item.prompt); 
    els.modalShareBtn.onclick = () => window.shareItem(item.id);
    const likes = item.likes || []; const isLikedByMe = currentUserId && likes.includes(currentUserId); els.modalLikeCount.textContent = likes.length; 
    if (isLikedByMe) { els.modalHeartIcon.classList.add('text-red-500', 'fill-current'); els.modalHeartIcon.classList.remove('text-gray-500', 'fill-none'); els.modalLikeBtn.classList.add('bg-pink-50', 'border-pink-200'); } else { els.modalHeartIcon.classList.add('text-gray-500', 'fill-none'); els.modalHeartIcon.classList.remove('text-red-500', 'fill-current'); els.modalLikeBtn.classList.remove('bg-pink-50', 'border-pink-200'); } 
    els.modalLikeBtn.onclick = () => { els.modalHeartIcon.classList.add('like-anim'); setTimeout(()=>els.modalHeartIcon.classList.remove('like-anim'), 400); window.toggleLike(item.id, item.userId); }; 
    listenToComments(item.id); 
    els.prevBtn.classList.toggle('hidden', currentModalIndex === 0); els.nextBtn.classList.toggle('hidden', currentModalIndex === modalItems.length - 1); 
}

window.openModal = (id) => { let filtered = allItems.filter(item => { const itemCat = item.category || 'Umum'; return (currentCategory === 'all' || itemCat === currentCategory) && (!currentUserIdFilter || item.userId === currentUserIdFilter); }); if (currentView === 'profile') filtered = allItems.filter(i => i.userId === profileUserId && (i.status === 'approved' || !i.status || (currentUserId === profileUserId))); else if (currentView === 'gallery') filtered = filtered.filter(item => item.status === 'approved' || !item.status); else if (currentView === 'liked') filtered = filtered.filter(item => (item.status === 'approved' || !item.status) && item.likes && item.likes.includes(currentUserId)); else if (currentView === 'myprompt') filtered = filtered.filter(item => item.userId === currentUserId); else if (currentView === 'pending') filtered = filtered.filter(item => item.userId === currentUserId && item.status === 'pending'); else if (currentView === 'request') filtered = filtered.filter(item => item.status === 'pending'); modalItems = filtered; const initialIndex = modalItems.findIndex(i => i.id === id); if (initialIndex === -1) return; updateModalContent(initialIndex); els.modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; updateUrlState({ id: id, view: currentView }); };
window.closeModal = () => { els.modal.classList.add('hidden'); document.body.style.overflow = ''; currentModalIndex = -1; modalItems = []; if(commentsUnsubscribe) commentsUnsubscribe(); Object.values(replyUnsubscribes).forEach(un=>un()); replyUnsubscribes={}; updateUrlState({ view: currentView }); };
window.showPrevItem = () => { if (currentModalIndex > 0) { updateModalContent(currentModalIndex - 1); updateUrlState({ id: modalItems[currentModalIndex - 1].id, view: currentView }); } }; window.showNextItem = () => { if (currentModalIndex < modalItems.length - 1) { updateModalContent(currentModalIndex + 1); updateUrlState({ id: modalItems[currentModalIndex + 1].id, view: currentView }); } };
els.modalImageArea.addEventListener('touchstart', (e) => { touchstartX = e.changedTouches[0].screenX; }, false); els.modalImageArea.addEventListener('touchend', (e) => { if (Math.abs(e.changedTouches[0].screenX - touchstartX) > 50) e.changedTouches[0].screenX < touchstartX ? window.showNextItem() : window.showPrevItem(); touchstartX = 0; }, false);
window.toggleReplyForm = (commentId) => { if (!currentUserId) return notify("Sila log masuk untuk membalas.", 'error'); const form = document.getElementById(`reply-form-${commentId}`); form.classList.toggle('hidden'); if (!form.classList.contains('hidden')) document.getElementById(`reply-input-${commentId}`).focus(); };
window.postReply = async (itemId, commentId, commentOwnerId) => { const input = document.getElementById(`reply-input-${commentId}`); const text = input.value.trim(); if (!text) return; const user = auth.currentUser; const replyData = { text: text, userId: currentUserId, userName: (user.displayName || 'User').split(' ')[0], timestamp: Date.now(), likes: [] }; try { input.value = ''; window.toggleReplyForm(commentId); const repliesRef = collection(db, `${galleryRef.path}/${itemId}/comments/${commentId}/replies`); await addDoc(repliesRef, replyData); if (commentOwnerId && commentOwnerId !== currentUserId) { const notifRef = collection(db, `/artifacts/${appId}/public/data/users/${commentOwnerId}/notifications`); addDoc(notifRef, { type: 'reply_comment', fromName: replyData.userName, itemId: itemId, promptSnippet: text.substring(0, 20) + '...', timestamp: Date.now(), read: false }).catch(console.error); } } catch (err) { console.error("Reply error:", err); notify("Gagal menghantar balasan.", 'error'); } };
window.deleteReply = async (itemId, commentId, replyId) => { if(!confirm("Padam balasan ini?")) return; try { await deleteDoc(doc(db, `${galleryRef.path}/${itemId}/comments/${commentId}/replies/${replyId}`)); notify("Balasan dipadam."); } catch(err) { notify("Gagal.", 'error'); } };
function listenToReplies(itemId, commentId, container) { if (replyUnsubscribes[commentId]) replyUnsubscribes[commentId](); const repliesRef = collection(db, `${galleryRef.path}/${itemId}/comments/${commentId}/replies`); const q = query(repliesRef, orderBy('timestamp', 'asc')); replyUnsubscribes[commentId] = onSnapshot(q, (snapshot) => { container.innerHTML = ''; snapshot.forEach(docSnap => { const r = docSnap.data(); const rid = docSnap.id; const isMyReply = currentUserId && r.userId === currentUserId; const canDelete = isMyReply || isSuperUser; const timeAgo = dayjs(r.timestamp).fromNow(); const div = document.createElement('div'); div.className = 'bg-gray-50 p-2 rounded border-l-2 border-gray-300 text-xs mt-1 group'; div.innerHTML = `<div class="flex justify-between items-start mb-1"><div class="flex items-center gap-2"><span class="font-bold text-gray-700 cursor-pointer hover:underline" onclick="window.showUserProfile('${r.userId}')">${r.userName || 'User'}</span><span class="text-[9px] text-gray-400">${timeAgo}</span></div>${canDelete ? `<button onclick="window.deleteReply('${itemId}', '${commentId}', '${rid}')" class="text-gray-300 hover:text-red-500" title="Padam">&times;</button>` : ''}</div><p class="text-gray-600 leading-tight">${r.text}</p>`; container.appendChild(div); }); }); }
function listenToComments(itemId) { if (commentsUnsubscribe) commentsUnsubscribe(); Object.values(replyUnsubscribes).forEach(unsubscribe => unsubscribe()); replyUnsubscribes = {}; const commentsRef = collection(db, `${galleryRef.path}/${itemId}/comments`); const q = query(commentsRef, orderBy('timestamp', 'asc')); commentsUnsubscribe = onSnapshot(q, (snapshot) => { els.commentsList.innerHTML = ''; els.commentCount.textContent = snapshot.size; if (snapshot.empty) { els.commentsList.innerHTML = '<p class="text-center text-gray-400 text-sm italic py-4">Tiada komen lagi.</p>'; return; } snapshot.forEach(docSnap => { const c = docSnap.data(); const cid = docSnap.id; const isMyComment = currentUserId && c.userId === currentUserId; const canDelete = isMyComment || isSuperUser; const timeAgo = dayjs(c.timestamp).fromNow(); const likes = c.likes || []; const isLiked = currentUserId && likes.includes(currentUserId); const likeCount = likes.length; const div = document.createElement('div'); div.className = 'bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm group'; div.innerHTML = `<div class="flex justify-between items-start mb-1"><div class="flex flex-col"><span class="font-bold text-gray-700 text-xs cursor-pointer hover:underline" onclick="window.showUserProfile('${c.userId}')">${c.userName || 'User'}</span><span class="text-[10px] text-gray-400">${timeAgo}</span></div><div class="flex items-center gap-2"><button onclick="window.toggleCommentLike('${itemId}', '${cid}', '${c.userId}')" class="flex items-center gap-1 text-gray-400 hover:text-pink-500 transition-colors ${isLiked ? 'text-pink-500' : ''}" title="Like"><span class="text-[10px] font-bold">${likeCount > 0 ? likeCount : ''}</span><svg class="w-3.5 h-3.5 ${isLiked ? 'fill-current' : 'fill-none'} stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button><button onclick="window.toggleReplyForm('${cid}')" class="text-gray-400 hover:text-blue-500 transition-colors" title="Balas"><svg class="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></button>${canDelete ? `<button onclick="window.deleteComment('${itemId}', '${cid}')" class="text-gray-300 hover:text-red-500 transition-colors" title="Padam">&times;</button>` : ''}</div></div><p class="text-gray-600 leading-snug mb-2">${c.text}</p><div id="replies-container-${cid}" class="ml-2 pl-2 border-l-2 border-gray-100 space-y-2"></div><div id="reply-form-${cid}" class="hidden mt-2 flex gap-2"><input type="text" id="reply-input-${cid}" placeholder="Balas..." class="flex-1 p-1.5 text-xs border rounded bg-gray-50 focus:ring-1 focus:ring-blue-500"><button onclick="window.postReply('${itemId}', '${cid}', '${c.userId}')" class="text-blue-600 text-xs font-bold px-2">Hantar</button></div>`; els.commentsList.appendChild(div); const repliesContainer = div.querySelector(`#replies-container-${cid}`); listenToReplies(itemId, cid, repliesContainer); }); }); }
window.postComment = async () => { const text = els.commentInput.value.trim(); if (!text) return; if (!currentUserId) return notify("Sila log masuk.", 'error'); const item = modalItems[currentModalIndex]; if (!item) return; const user = auth.currentUser; const commentData = { text: text, userId: currentUserId, userName: (user.displayName || 'User').split(' ')[0], timestamp: Date.now(), likes: [] }; try { els.commentInput.value = ''; const commentsRef = collection(db, `${galleryRef.path}/${item.id}/comments`); await addDoc(commentsRef, commentData); scrollToBottomComments(); if (item.userId && item.userId !== currentUserId) { const notifRef = collection(db, `/artifacts/${appId}/public/data/users/${item.userId}/notifications`); addDoc(notifRef, { type: 'comment', fromName: commentData.userName, itemId: item.id, promptSnippet: item.prompt.substring(0, 20) + '...', timestamp: Date.now(), read: false }).catch(console.error); } } catch (err) { console.error(err); notify("Gagal menghantar komen.", 'error'); } };
window.deleteComment = async (itemId, commentId) => { if(!confirm("Padam komen ini?")) return; try { await deleteDoc(doc(db, `${galleryRef.path}/${itemId}/comments/${commentId}`)); notify("Komen dipadam."); } catch(err) { notify("Gagal padam komen.", 'error'); } };
window.toggleCommentLike = async (itemId, commentId, commentOwnerId) => { if (!currentUserId) return notify("Log masuk untuk like.", 'error'); const commentRef = doc(db, `${galleryRef.path}/${itemId}/comments/${commentId}`); try { const snap = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js").then(m=>m.getDoc(commentRef)); if(snap.exists()) { const c = snap.data(); const likes = c.likes || []; if(likes.includes(currentUserId)) await updateDoc(commentRef, { likes: arrayRemove(currentUserId) }); else { await updateDoc(commentRef, { likes: arrayUnion(currentUserId) }); if(commentOwnerId && commentOwnerId !== currentUserId) { const notifRef = collection(db, `/artifacts/${appId}/public/data/users/${commentOwnerId}/notifications`); const user = auth.currentUser; addDoc(notifRef, { type: 'like_comment', fromName: (user.displayName||'User').split(' ')[0], itemId: itemId, promptSnippet: c.text.substring(0, 15) + '...', timestamp: Date.now(), read: false }).catch(console.error); } } } } catch(e) { console.error(e); } };
function listenToNotifications(uid) { const notifRef = collection(db, `/artifacts/${appId}/public/data/users/${uid}/notifications`); const q = query(notifRef, orderBy('timestamp', 'desc')); onSnapshot(q, (snap) => { snap.docChanges().forEach(async (change) => { if (change.type === 'added') { const data = change.doc.data(); if (!data.read && Date.now() - data.timestamp < 10000) { let msg = "Notifikasi baru"; if(data.type === 'like') msg = `❤️ ${data.fromName} menyukai promp anda`; else if(data.type === 'comment') msg = `💬 ${data.fromName} mengomen promp anda`; else if(data.type === 'like_comment') msg = `❤️ ${data.fromName} menyukai komen anda`; else if(data.type === 'reply_comment') msg = `↩️ ${data.fromName} membalas komen anda`; notify(msg, 'success'); await deleteDoc(change.doc.ref); } } }); }); }

// INIT
async function init() { 
    const app = initializeApp(firebaseConfig); db = getFirestore(app); auth = getAuth(app); galleryRef = collection(db, `/artifacts/${appId}/public/data/gallery`); categoriesRef = collection(db, `/artifacts/${appId}/public/data/categories`); storage = getStorage(app);
    
    onSnapshot(query(categoriesRef), snap => { const cats = []; els.catSelect.innerHTML = '<option value="">-- Pilih --</option>'; els.catTabs.innerHTML = ''; snap.forEach(d => cats.push(d.data().name)); cats.sort(); ['all', ...cats].forEach(cat => { const btn = document.createElement('button'); btn.textContent = cat === 'all' ? 'Semua' : cat; btn.className = `px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${currentCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`; btn.onclick = () => window.filterByCategory(cat); els.catTabs.appendChild(btn); if(cat !== 'all') els.catSelect.innerHTML += `<option value="${cat}">${cat}</option>`; }); }); 
    
    onSnapshot(query(galleryRef), snap => { 
        allItems = []; snap.forEach(d => allItems.push({id: d.id, ...d.data()})); allItems.sort((a, b) => b.timestamp - a.timestamp); updateCounts(); 
        if(currentView === 'profile') renderProfileGallery(profileUserId); else renderGallery();
        
        // Deep link logic
        if (isInitialLoad) {
            const params = new URLSearchParams(window.location.search); const view = params.get('view'); const id = params.get('id');
            if (view && view !== 'gallery') window.switchView(view);
            if (id && !els.modal.classList.contains('hidden') === false) {
                const itemIndex = allItems.findIndex(i => i.id === id);
                if (itemIndex !== -1) {
                     let filtered = allItems.filter(item => { const itemCat = item.category || 'Umum'; return (currentCategory === 'all' || itemCat === currentCategory) && (!currentUserIdFilter || item.userId === currentUserIdFilter); });
                     if (currentView === 'gallery') filtered = filtered.filter(item => item.status === 'approved' || !item.status);
                     modalItems = allItems; updateModalContent(itemIndex); els.modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; currentModalIndex = itemIndex;
                }
            }
            isInitialLoad = false;
        } else {
            if (!els.modal.classList.contains('hidden') && currentModalIndex !== -1) { const currentItem = modalItems[currentModalIndex]; if(currentItem) { const updatedItem = allItems.find(i => i.id === currentItem.id); if(updatedItem) { modalItems[currentModalIndex] = updatedItem; updateModalContent(currentModalIndex); } } } 
        }
    }); 
    
    onAuthStateChanged(auth, async user => { 
        if (user) { 
            currentUserId = user.uid; isSuperUser = user.email === SUPER_USER_EMAIL; 
            els.userWelcome.textContent = `Hi, ${user.displayName?.split(' ')[0]}`; els.userWelcome.classList.remove('hidden'); els.loginBtn.classList.add('hidden'); els.userControls.classList.remove('hidden'); els.navs.myprompt.classList.remove('hidden'); els.navs.pending.classList.remove('hidden'); els.commentInputArea.classList.remove('hidden'); els.loginToComment.classList.add('hidden'); 
            if(isSuperUser) { els.navs.request.classList.remove('hidden'); els.navs.pending.classList.add('hidden'); } else els.navs.request.classList.add('hidden'); 
            listenToNotifications(user.uid); 
            try { const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid); await setDoc(userDocRef, { displayName: user.displayName, photoURL: user.photoURL, email: user.email }, { merge: true }); } catch(e) { console.error("Error autosave profile", e); }
            updateMobileMenuUI(user);
        } else { 
            currentUserId = null; isSuperUser = false; els.userWelcome.classList.add('hidden'); els.loginBtn.classList.remove('hidden'); els.userControls.classList.add('hidden'); els.addFormContainer.classList.add('hidden'); els.commentInputArea.classList.add('hidden'); els.loginToComment.classList.remove('hidden'); 
            const params = new URLSearchParams(window.location.search); if (!params.get('view')) switchView('gallery');
            updateMobileMenuUI(null);
        } 
        renderGallery(); 
    }); 
}

// LISTENERS
els.addForm.onsubmit = window.addItem; els.loginBtn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider()); els.mobileLoginBtn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider()); els.logoutBtn.onclick = () => signOut(auth); els.mobileLogoutBtn.onclick = () => signOut(auth);
els.toggleFormBtn.onclick = () => { els.addFormContainer.classList.toggle('hidden'); els.toggleFormBtn.innerHTML = els.addFormContainer.classList.contains('hidden') ? '+' : '&times;'; els.toggleFormBtn.classList.toggle('bg-green-600'); els.toggleFormBtn.classList.toggle('bg-red-600'); }; els.mobileAddBtn.onclick = () => { els.addFormContainer.classList.remove('hidden'); window.scrollTo(0,0); }; els.mobileMenuBtn.onclick = window.toggleMobileMenu;
els.approveAllBtn.onclick = window.approveAll; els.closeModalBtn.onclick = window.closeModal; els.modal.onclick = (e) => { if(e.target === els.modal) window.closeModal(); }; els.prevBtn.onclick = window.showPrevItem; els.nextBtn.onclick = window.showNextItem;
if(els.navs.myprofile) { els.navs.myprofile.onclick = () => { if(currentUserId) window.showUserProfile(currentUserId); else notify("Sila log masuk dahulu.", 'error'); }; }
if(els.mobileNavMyProfile) { els.mobileNavMyProfile.onclick = () => { if(currentUserId) { window.showUserProfile(currentUserId); window.toggleMobileMenu(); } else { notify("Sila log masuk dahulu.", 'error'); } }; }
Object.keys(els.navs).forEach(key => { if(els.navs[key] && key !== 'myprofile') els.navs[key].onclick = () => switchView(key); });
document.addEventListener('DOMContentLoaded', init);
