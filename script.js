try {
    // Firebase Configuration (Update with your actual Firebase project details)
    const firebaseConfig = {
        apiKey: "AIzaSyC2P8k2i4W-xi2bG3T2gq3B7Q4W5H6J7K8",
        authDomain: "study-planner-5234.firebaseapp.com",
        projectId: "study-planner-5234",
        storageBucket: "study-planner-5234.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef1234567890abcdef"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const auth = firebase.auth();

    // State Management
    let selectedDay = new Date().toISOString().split('T')[0];
    let tasks = [];
    let deletedTasks = [];
    let settings = {
        totalDays: 600,
        startDate: '2025-06-01',
        headerPhoto: 'https://via.placeholder.com/80',
        countDays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        theme: 'light'
    };
    let currentUser = null;

    // DOM Elements
    const DOM = {
        weekSelect: document.getElementById('weekSelect'),
        dayButtons: document.getElementById('dayButtons'),
        taskList: document.getElementById('taskList'),
        deletedTasksList: document.getElementById('deletedTasksList'),
        addTaskForm: document.getElementById('addTaskForm'),
        taskFormTitle: document.getElementById('taskFormTitle'),
        taskFormSubmit: document.getElementById('taskFormSubmit'),
        taskSubject: document.getElementById('taskSubject'),
        taskTopic: document.getElementById('taskTopic'),
        taskDetails: document.getElementById('taskDetails'),
        totalDaysInput: document.getElementById('totalDaysInput'),
        startDateInput: document.getElementById('startDateInput'),
        headerPhotoInput: document.getElementById('headerPhotoInput'),
        headerPhoto: document.getElementById('headerPhoto'),
        currentDate: document.getElementById('currentDate'),
        currentDayCount: document.getElementById('currentDayCount'),
        currentTime: document.getElementById('currentTime'),
        taskCount: document.getElementById('taskCount'),
        totalTasks: document.getElementById('totalTasks'),
        completedTasks: document.getElementById('completedTasks'),
        completionPercentage: document.getElementById('completionPercentage'),
        progressBarFill: document.getElementById('progressBarFill'),
        taskSearch: document.getElementById('taskSearch'),
        searchClear: document.getElementById('searchClear'),
        editForm: document.getElementById('editForm'),
        dailySummary: document.getElementById('dailySummary'),
        dailyTimeTotal: document.getElementById('dailyTimeTotal'),
        dailyTimeEdit: document.getElementById('dailyTimeEdit'),
        dailyTimeInput: document.getElementById('dailyTimeInput'),
        completedTasksCount: document.getElementById('completedTasksCount'),
        pendingTasksCount: document.getElementById('pendingTasksCount'),
        totalTasksCount: document.getElementById('totalTasksCount'),
        taskDetailsModal: document.getElementById('taskDetailsModal'),
        taskDetailsContent: document.getElementById('taskDetailsContent'),
        deleteConfirmModal: document.getElementById('deleteConfirmModal'),
        progressChartModal: document.getElementById('progressChartModal'),
        progressTimeframe: document.getElementById('progressTimeframe'),
        clearAllButton: document.getElementById('clearAllButton'),
        voiceSubjectButton: document.getElementById('voiceSubjectButton'),
        voiceTopicButton: document.getElementById('voiceTopicButton'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage')
    };

    // Validate DOM Elements
    Object.values(DOM).forEach((el, index) => {
        if (!el) console.error(`DOM element at index ${index} is null`);
    });

    // Authentication
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            loadSettings();
            initializeWeekSelect();
            loadTasks();
            loadDeletedTasks();
            updateUI();
            setupVoiceInput();
        } else {
            signIn();
        }
    });

    function signIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            showToast(`Authentication Error: ${error.message}`);
        });
    }

    // Settings Management
    function loadSettings() {
        if (!currentUser) return;
        db.collection('users').doc(currentUser.uid).get().then(doc => {
            if (doc.exists) {
                settings = { ...settings, ...doc.data() };
                applySettings();
            }
            db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
                if (doc.exists) {
                    settings = { ...settings, ...doc.data() };
                    applySettings();
                    initializeWeekSelect();
                    updateUI();
                }
            });
        }).catch(error => {
            showToast(`Error loading settings: ${error.message}`);
        });
    }

    function saveSettings() {
        if (!DOM.totalDaysInput || !DOM.startDateInput || !DOM.headerPhotoInput) {
            showToast('Settings form elements missing');
            return;
        }
        settings.totalDays = parseInt(DOM.totalDaysInput.value) || 600;
        settings.startDate = DOM.startDateInput.value || '2025-06-01';
        settings.headerPhoto = DOM.headerPhotoInput.value || 'https://via.placeholder.com/80';
        settings.countDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value);
        settings.theme = document.body.dataset.theme;
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).set(settings).then(() => {
                showToast('Settings saved successfully!');
                toggleEditForm();
                initializeWeekSelect();
                updateUI();
            }).catch(error => {
                showToast(`Error saving settings: ${error.message}`);
            });
        }
    }

    function applySettings() {
        if (DOM.headerPhoto && DOM.totalDaysInput && DOM.startDateInput && DOM.headerPhotoInput) {
            DOM.headerPhoto.src = settings.headerPhoto;
            document.body.dataset.theme = settings.theme;
            DOM.totalDaysInput.value = settings.totalDays;
            DOM.startDateInput.value = settings.startDate;
            DOM.headerPhotoInput.value = settings.headerPhoto;
            document.querySelectorAll('.day-checkbox').forEach(cb => {
                cb.checked = settings.countDays.includes(cb.value);
            });
        }
    }

    // Date and Time Utilities
    function formatDate(date) {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function calculateDayCount() {
        const start = new Date(settings.startDate);
        const today = new Date();
        let count = 0;
        let current = new Date(start);
        while (current <= today) {
            const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'short' });
            if (settings.countDays.includes(dayOfWeek)) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return `Day ${Math.min(count, settings.totalDays)}/${settings.totalDays}`;
    }

    function updateCurrentTime() {
        const now = new Date();
        if (DOM.currentTime) {
            DOM.currentTime.textContent = now.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Kolkata' });
        }
    }

    // Week and Day Management
    function initializeWeekSelect() {
        if (!DOM.weekSelect) return;
        DOM.weekSelect.innerHTML = '';
        const startDate = new Date(settings.startDate);
        const today = new Date();
        let currentWeekStart = new Date(startDate);
        currentWeekStart.setDate(startDate.getDate() - startDate.getDay());
        let weekIndex = 0;
        while (currentWeekStart <= today) {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);
            const option = document.createElement('option');
            option.value = weekIndex;
            option.textContent = `Week ${weekIndex + 1}: ${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
            if (isDateInWeek(today, currentWeekStart)) {
                option.selected = true;
            }
            DOM.weekSelect.appendChild(option);
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            weekIndex++;
        }
        updateWeek();
    }

    function isDateInWeek(date, weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return date >= weekStart && date <= weekEnd;
    }

    function updateWeek() {
        if (!DOM.weekSelect || !DOM.dayButtons) return;
        const weekIndex = parseInt(DOM.weekSelect.value);
        const startDate = new Date(settings.startDate);
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + weekIndex * 7 - startDate.getDay());
        DOM.dayButtons.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            const dayOfWeek = day.toLocaleDateString('en-US', { weekday: 'short' });
            if (settings.countDays.includes(dayOfWeek)) {
                const button = document.createElement('button');
                button.className = `px-4 py-2 rounded-lg font-semibold transition duration-300 ${day.toDateString() === new Date(selectedDay).toDateString() ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-indigo-200'}`;
                button.textContent = `${day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}`;
                button.onclick = () => selectDay(day.toISOString().split('T')[0]);
                DOM.dayButtons.appendChild(button);
            }
        }
        selectDay(selectedDay);
    }

    // Task Management
    function loadTasks() {
        if (!currentUser || !DOM.taskList) return;
        db.collection('users').doc(currentUser.uid).collection('tasks')
            .where('date', '==', selectedDay)
            .onSnapshot(snapshot => {
                tasks = [];
                snapshot.forEach(doc => {
                    tasks.push({ id: doc.id, ...doc.data() });
                });
                renderTasks();
                updateSummary();
            }, error => {
                showToast(`Error loading tasks: ${error.message}`);
            });
    }

    function loadDeletedTasks() {
        if (!currentUser || !DOM.deletedTasksList) return;
        db.collection('users').doc(currentUser.uid).collection('deletedTasks')
            .onSnapshot(snapshot => {
                deletedTasks = [];
                snapshot.forEach(doc => {
                    deletedTasks.push({ id: doc.id, ...doc.data() });
                });
                renderDeletedTasks();
            }, error => {
                showToast(`Error loading deleted tasks: ${error.message}`);
            });
    }

    function renderTasks(filter = '') {
        if (!DOM.taskList) return;
        DOM.taskList.innerHTML = '';
        const filteredTasks = tasks.filter(task =>
            task.subject.toLowerCase().includes(filter.toLowerCase()) ||
            task.topic.toLowerCase().includes(filter.toLowerCase())
        );
        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-card bg-white p-4 rounded-lg shadow-lg border border-gray-100 flex justify-between items-center transition duration-300';
            taskElement.innerHTML = `
                <div class="flex items-center space-x-3">
                    <input type="checkbox" class="custom-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion('${task.id}', this.checked)" aria-label="Toggle task completion for ${task.subject}">
                    <div>
                        <p class="font-semibold text-gray-800">${task.subject}</p>
                        <p class="text-gray-600">${task.topic}</p>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="showTaskDetails('${task.id}')" class="text-indigo-500 hover:text-indigo-700" aria-label="View details for ${task.subject}"><i class="fas fa-info-circle"></i></button>
                    <button onclick="editTask('${task.id}')" class="text-blue-500 hover:text-blue-700" aria-label="Edit ${task.subject}"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteTask('${task.id}')" class="text-red-500 hover:text-red-700" aria-label="Delete ${task.subject}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            DOM.taskList.appendChild(taskElement);
        });
        updateTaskCount();
    }

    function renderDeletedTasks() {
        if (!DOM.deletedTasksList || !DOM.clearAllButton) return;
        DOM.deletedTasksList.innerHTML = '';
        deletedTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-card bg-gray-100 p-4 rounded-lg shadow-lg border border-gray-200 flex justify-between items-center transition duration-300';
            taskElement.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">${task.subject}</p>
                    <p class="text-gray-600">${task.topic}</p>
                    <p class="text-sm text-gray-500">Deleted on: ${new Date(task.deletedAt).toLocaleString()}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="restoreTask('${task.id}')" class="text-green-500 hover:text-green-700" aria-label="Restore ${task.subject}"><i class="fas fa-undo"></i></button>
                    <button onclick="permanentlyDeleteTask('${task.id}')" class="text-red-500 hover:text-red-700" aria-label="Permanently delete ${task.subject}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            DOM.deletedTasksList.appendChild(taskElement);
        });
        DOM.clearAllButton.disabled = deletedTasks.length === 0;
    }

    function toggleTaskCompletion(taskId, completed) {
        if (!currentUser) return;
        db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).update({
            completed,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            showToast('Task status updated!');
            confetti({ particleCount: 50, spread: 60 });
            updateSummary();
            updateProgressChart();
        }).catch(error => {
            showToast(`Error updating task: ${error.message}`);
        });
    }

    function submitTaskForm() {
        if (!DOM.taskSubject || !DOM.taskTopic || !DOM.taskDetails || !DOM.taskFormSubmit) {
            showToast('Task form elements missing');
            return;
        }
        const subject = DOM.taskSubject.value.trim();
        const topic = DOM.taskTopic.value.trim();
        const details = DOM.taskDetails.value.trim();
        if (!subject || !topic) {
            showToast('Subject and Description are required!');
            return;
        }
        const taskData = {
            subject,
            topic,
            details,
            date: selectedDay,
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const taskId = DOM.taskFormSubmit.dataset.taskId;
        if (taskId) {
            db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).update(taskData).then(() => {
                showToast('Task updated successfully!');
                toggleAddTaskForm();
                updateSummary();
            }).catch(error => {
                showToast(`Error updating task: ${error.message}`);
            });
        } else {
            db.collection('users').doc(currentUser.uid).collection('tasks').add(taskData).then(() => {
                showToast('Task added successfully!');
                toggleAddTaskForm();
                updateSummary();
            }).catch(error => {
                showToast(`Error adding task: ${error.message}`);
            });
        }
    }

    function editTask(taskId) {
        if (!DOM.taskFormTitle || !DOM.taskSubject || !DOM.taskTopic || !DOM.taskDetails || !DOM.taskFormSubmit || !DOM.addTaskForm) return;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            DOM.taskFormTitle.textContent = 'Edit Task';
            DOM.taskSubject.value = task.subject;
            DOM.taskTopic.value = task.topic;
            DOM.taskDetails.value = task.details;
            DOM.taskFormSubmit.dataset.taskId = taskId;
            DOM.addTaskForm.classList.remove('hidden');
        }
    }

    function deleteTask(taskId) {
        if (!DOM.deleteConfirmModal) return;
        DOM.deleteConfirmModal.classList.remove('hidden');
        DOM.deleteConfirmModal.dataset.taskId = taskId;
    }

    function confirmDelete() {
        if (!DOM.deleteConfirmModal) return;
        const taskId = DOM.deleteConfirmModal.dataset.taskId;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            db.collection('users').doc(currentUser.uid).collection('tasks').doc(taskId).delete().then(() => {
                db.collection('users').doc(currentUser.uid).collection('deletedTasks').add({
                    ...task,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    showToast('Task moved to recycle bin!');
                    DOM.deleteConfirmModal.classList.add('hidden');
                    updateSummary();
                }).catch(error => {
                    showToast(`Error moving task to recycle bin: ${error.message}`);
                });
            }).catch(error => {
                showToast(`Error deleting task: ${error.message}`);
            });
        }
    }

    function cancelDelete() {
        if (DOM.deleteConfirmModal) {
            DOM.deleteConfirmModal.classList.add('hidden');
        }
    }

    function restoreTask(taskId) {
        if (!currentUser) return;
        const task = deletedTasks.find(t => t.id === taskId);
        if (task) {
            db.collection('users').doc(currentUser.uid).collection('deletedTasks').doc(taskId).delete().then(() => {
                db.collection('users').doc(currentUser.uid).collection('tasks').add({
                    ...task,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    showToast('Task restored successfully!');
                }).catch(error => {
                    showToast(`Error restoring task: ${error.message}`);
                });
            }).catch(error => {
                showToast(`Error deleting from recycle bin: ${error.message}`);
            });
        }
    }

    function permanentlyDeleteTask(taskId) {
        if (!currentUser) return;
        db.collection('users').doc(currentUser.uid).collection('deletedTasks').doc(taskId).delete().then(() => {
            showToast('Task permanently deleted!');
        }).catch(error => {
            showToast(`Error permanently deleting task: ${error.message}`);
        });
    }

    function clearAllDeletedTasks() {
        if (!currentUser) return;
        const batch = db.batch();
        deletedTasks.forEach(task => {
            const ref = db.collection('users').doc(currentUser.uid).collection('deletedTasks').doc(task.id);
            batch.delete(ref);
        });
        batch.commit().then(() => {
            showToast('All deleted tasks cleared!');
        }).catch(error => {
            showToast(`Error clearing deleted tasks: ${error.message}`);
        });
    }

    function selectDay(day) {
        selectedDay = day;
        updateWeek();
        loadTasks();
    }

    // UI Updates
    function updateUI() {
        if (DOM.currentDate && DOM.currentDayCount) {
            DOM.currentDate.textContent = formatDate(new Date());
            DOM.currentDayCount.textContent = calculateDayCount();
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);
        }
    }

    function updateTaskCount() {
        if (!DOM.taskCount || !DOM.totalTasks || !DOM.completedTasks || !DOM.completionPercentage || !DOM.progressBarFill || !DOM.taskSearch) return;
        const filteredTasks = tasks.filter(task =>
            task.subject.toLowerCase().includes(DOM.taskSearch.value.toLowerCase()) ||
            task.topic.toLowerCase().includes(DOM.taskSearch.value.toLowerCase())
        );
        DOM.taskCount.textContent = `Task: ${filteredTasks.length}/${tasks.length}`;
        DOM.totalTasks.textContent = tasks.length;
        DOM.completedTasks.textContent = tasks.filter(t => t.completed).length;
        const percentage = tasks.length ? (tasks.filter(t => t.completed).length / tasks.length * 100).toFixed(0) : 0;
        DOM.completionPercentage.textContent = `${percentage}%`;
        DOM.progressBarFill.style.width = `${percentage}%`;
    }

    function updateSummary() {
        if (!currentUser || !DOM.dailyTimeTotal || !DOM.completedTasksCount || !DOM.pendingTasksCount || !DOM.totalTasksCount) return;
        db.collection('users').doc(currentUser.uid).collection('dailySummaries').doc(selectedDay).get().then(doc => {
            const data = doc.exists ? doc.data() : { totalTime: 0 };
            const totalSeconds = data.totalTime || 0;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            DOM.dailyTimeTotal.textContent = `${hours}h ${minutes}m ${seconds}s`;
            DOM.completedTasksCount.textContent = tasks.filter(t => t.completed).length;
            DOM.pendingTasksCount.textContent = tasks.filter(t => !t.completed).length;
            DOM.totalTasksCount.textContent = tasks.length;
        }).catch(error => {
            showToast(`Error loading summary: ${error.message}`);
        });
    }

    // Form and Modal Controls
    function toggleAddTaskForm() {
        if (!DOM.addTaskForm || !DOM.taskFormTitle || !DOM.taskSubject || !DOM.taskTopic || !DOM.taskDetails || !DOM.taskFormSubmit) return;
        DOM.addTaskForm.classList.toggle('hidden');
        DOM.taskFormTitle.textContent = 'Add New Task';
        DOM.taskSubject.value = '';
        DOM.taskTopic.value = '';
        DOM.taskDetails.value = '';
        delete DOM.taskFormSubmit.dataset.taskId;
    }

    function toggleEditForm() {
        if (DOM.editForm) {
            DOM.editForm.classList.toggle('hidden');
        }
    }

    function cancelTaskForm() {
        toggleAddTaskForm();
    }

    function showTaskDetails(taskId) {
        if (!DOM.taskDetailsModal || !DOM.taskDetailsContent) return;
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            DOM.taskDetailsContent.innerHTML = `
                <p><strong>Subject:</strong> ${task.subject}</p>
                <p><strong>Description:</strong> ${task.topic}</p>
                <p><strong>Details:</strong> ${task.details || 'N/A'}</p>
                <p><strong>Status:</strong> ${task.completed ? 'Completed' : 'Pending'}</p>
                <p><strong>Created:</strong> ${task.createdAt ? new Date(task.createdAt.toDate()).toLocaleString() : 'N/A'}</p>
            `;
            DOM.taskDetailsModal.classList.remove('hidden');
        }
    }

    function closeTaskDetailsModal() {
        if (DOM.taskDetailsModal) {
            DOM.taskDetailsModal.classList.add('hidden');
        }
    }

    function editDailyTime() {
        if (!DOM.dailyTimeTotal || !DOM.dailyTimeEdit || !DOM.dailyTimeInput) return;
        DOM.dailyTimeTotal.classList.add('hidden');
        DOM.dailyTimeEdit.classList.remove('hidden');
        DOM.dailyTimeInput.value = DOM.dailyTimeTotal.textContent;
        DOM.dailyTimeInput.focus();
    }

    function saveDailyTime() {
        if (!DOM.dailyTimeInput || !DOM.dailyTimeTotal || !DOM.dailyTimeEdit) return;
        const timeStr = DOM.dailyTimeInput.value.trim();
        const timeRegex = /^(\d+h)?\s*(\d+m)?\s*(\d+s)?$/;
        if (!timeRegex.test(timeStr)) {
            showToast('Invalid time format! Use e.g., 2h 30m 15s');
            return;
        }
        const parts = timeStr.match(timeRegex);
        const hours = parseInt(parts[1] || '0') || 0;
        const minutes = parseInt(parts[2] || '0') || 0;
        const seconds = parseInt(parts[3] || '0') || 0;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).collection('dailySummaries').doc(selectedDay).set({
                totalTime: totalSeconds,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                showToast('Daily time updated!');
                DOM.dailyTimeTotal.classList.remove('hidden');
                DOM.dailyTimeEdit.classList.add('hidden');
                updateSummary();
            }).catch(error => {
                showToast(`Error saving daily time: ${error.message}`);
            });
        }
    }

    // Progress Chart
    let progressChartInstance = null;

    function openProgressChartModal() {
        if (DOM.progressChartModal) {
            DOM.progressChartModal.classList.remove('hidden');
            updateProgressChart();
        }
    }

    function closeProgressChartModal() {
        if (DOM.progressChartModal) {
            DOM.progressChartModal.classList.add('hidden');
            if (progressChartInstance) {
                progressChartInstance.destroy();
                progressChartInstance = null;
            }
        }
    }

    async function updateProgressChart() {
        if (!currentUser || !DOM.progressTimeframe) return;
        const timeframe = DOM.progressTimeframe.value;
        let labels = [];
        let completedData = [];
        let totalData = [];
        const startDate = new Date(settings.startDate);
        const today = new Date();

        if (timeframe === 'daily') {
            const days = [];
            let current = new Date(startDate);
            while (current <= today) {
                days.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
            labels = days.slice(-7);
            for (const day of labels) {
                const snapshot = await db.collection('users').doc(currentUser.uid).collection('tasks').where('date', '==', day).get();
                const tasks = snapshot.docs.map(doc => doc.data());
                completedData.push(tasks.filter(t => t.completed).length);
                totalData.push(tasks.length);
            }
        } else if (timeframe === 'weekly') {
            let weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() - startDate.getDay());
            while (weekStart <= today) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                labels.push(`Week ${labels.length + 1}`);
                const snapshot = await db.collection('users').doc(currentUser.uid).collection('tasks')
                    .where('date', '>=', weekStart.toISOString().split('T')[0])
                    .where('date', '<=', weekEnd.toISOString().split('T')[0]).get();
                const tasks = snapshot.docs.map(doc => doc.data());
                completedData.push(tasks.filter(t => t.completed).length);
                totalData.push(tasks.length);
                weekStart.setDate(weekStart.getDate() + 7);
            }
            labels = labels.slice(-4);
            completedData = completedData.slice(-4);
            totalData = totalData.slice(-4);
        } else if (timeframe === 'monthly') {
            let monthStart = new Date(startDate);
            monthStart.setDate(1);
            while (monthStart <= today) {
                const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
                labels.push(monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
                const snapshot = await db.collection('users').doc(currentUser.uid).collection('tasks')
                    .where('date', '>=', monthStart.toISOString().split('T')[0])
                    .where('date', '<=', monthEnd.toISOString().split('T')[0]).get();
                const tasks = snapshot.docs.map(doc => doc.data());
                completedData.push(tasks.filter(t => t.completed).length);
                totalData.push(tasks.length);
                monthStart.setMonth(monthStart.getMonth() + 1);
            }
            labels = labels.slice(-6);
            completedData = completedData.slice(-6);
            totalData = totalData.slice(-6);
        }

        const ctx = document.getElementById('progressChart').getContext('2d');
        if (progressChartInstance) {
            progressChartInstance.destroy();
        }
        progressChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Completed Tasks',
                        data: completedData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Total Tasks',
                        data: totalData,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Number of Tasks' } },
                    x: { title: { display: true, text: timeframe.charAt(0).toUpperCase() + timeframe.slice(1) } }
                },
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    // Search and Voice Input
    const debouncedSearch = debounce(() => {
        if (!DOM.taskSearch || !DOM.searchClear) return;
        const filter = DOM.taskSearch.value.trim();
        DOM.searchClear.classList.toggle('visible', filter.length > 0);
        renderTasks(filter);
    }, 300);

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function clearSearch() {
        if (DOM.taskSearch && DOM.searchClear) {
            DOM.taskSearch.value = '';
            DOM.searchClear.classList.remove('visible');
            renderTasks();
        }
    }

    function setupVoiceInput() {
        if ('webkitSpeechRecognition' in window && DOM.voiceSubjectButton && DOM.voiceTopicButton) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            DOM.voiceSubjectButton.onclick = () => {
                recognition.start();
                recognition.onresult = event => {
                    DOM.taskSubject.value = event.results[0][0].transcript;
                    recognition.stop();
                };
            };

            DOM.voiceTopicButton.onclick = () => {
                recognition.start();
                recognition.onresult = event => {
                    DOM.taskTopic.value = event.results[0][0].transcript;
                    recognition.stop();
                };
            };

            recognition.onerror = event => {
                showToast(`Voice recognition error: ${event.error}`);
            };
        } else {
            if (DOM.voiceSubjectButton) DOM.voiceSubjectButton.style.display = 'none';
            if (DOM.voiceTopicButton) DOM.voiceTopicButton.style.display = 'none';
            showToast('Voice recognition not supported in this browser.');
        }
    }

    // Toast Notifications
    function showToast(message) {
        if (DOM.toast && DOM.toastMessage) {
            DOM.toastMessage.textContent = message;
            DOM.toast.classList.remove('hidden');
            setTimeout(hideToast, 3000);
        }
    }

    function hideToast() {
        if (DOM.toast) {
            DOM.toast.classList.add('hidden');
        }
    }

    // Theme Toggle
    function toggleTheme() {
        const newTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
        document.body.dataset.theme = newTheme;
        settings.theme = newTheme;
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).update({ theme: newTheme }).catch(error => {
                showToast(`Error saving theme: ${error.message}`);
            });
        }
    }

    // Event Listeners
    if (DOM.weekSelect) DOM.weekSelect.onchange = updateWeek;
    if (DOM.taskSearch) DOM.taskSearch.oninput = debouncedSearch;
    if (DOM.searchClear) DOM.searchClear.onclick = clearSearch;
    if (DOM.taskFormSubmit) DOM.taskFormSubmit.onclick = submitTaskForm;

} catch (error) {
    console.error('Initialization error:', error);
    alert('An error occurred while loading the application. Please check the console for details.');
}
