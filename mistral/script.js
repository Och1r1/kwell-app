// Main Application State
const appState = {
    currentUser: {
        id: 'user1',
        name: 'Phát Mai',
        skills: ['research', 'writing', 'presentation'],
        avatar: 'https://via.placeholder.com/40'
    },
    teamMembers: [
        {
            id: 'user1',
            name: 'Phát Mai',
            skills: ['research', 'writing', 'presentation'],
            avatar: 'https://via.placeholder.com/40',
            tasksCompleted: 0,
            tasksAssigned: 0,
            messagesSent: 0,
            contributionPercentage: 0
        },
        {
            id: 'user2',
            name: 'Alex Johnson',
            skills: ['coding', 'research', 'data analysis'],
            avatar: 'https://via.placeholder.com/40',
            tasksCompleted: 0,
            tasksAssigned: 0,
            messagesSent: 0,
            contributionPercentage: 0
        },
        {
            id: 'user3',
            name: 'Sarah Williams',
            skills: ['design', 'writing', 'presentation'],
            avatar: 'https://via.placeholder.com/40',
            tasksCompleted: 0,
            tasksAssigned: 0,
            messagesSent: 0,
            contributionPercentage: 0
        },
        {
            id: 'user4',
            name: 'Michael Brown',
            skills: ['coding', 'data analysis', 'testing'],
            avatar: 'https://via.placeholder.com/40',
            tasksCompleted: 0,
            tasksAssigned: 0,
            messagesSent: 0,
            contributionPercentage: 0
        }
    ],
    tasks: [],
    messages: [],
    files: [],
    availableSkills: ['research', 'coding', 'writing', 'presentation', 'design', 'data analysis', 'testing'],
    channels: ['general', 'research', 'development', 'design'],
    currentChannel: 'general'
};

// DOM Elements
const domElements = {
    sections: {
        dashboard: document.getElementById('dashboard'),
        chat: document.getElementById('chat'),
        tasks: document.getElementById('tasks'),
        files: document.getElementById('files'),
        contributions: document.getElementById('contributions')
    },
    navButtons: document.querySelectorAll('.nav-btn'),
    currentUserName: document.getElementById('current-user-name'),
    activeTasksCount: document.getElementById('active-tasks-count'),
    upcomingDeadlines: document.getElementById('upcoming-deadlines'),
    contributionChart: document.getElementById('contribution-chart'),
    createTaskBtn: document.getElementById('create-task-btn'),
    assignTasksBtn: document.getElementById('assign-tasks-btn'),
    createTaskModal: document.getElementById('create-task-modal'),
    taskDetailsModal: document.getElementById('task-details-modal'),
    createTaskForm: document.getElementById('create-task-form'),
    taskTitle: document.getElementById('task-title'),
    taskDescription: document.getElementById('task-description'),
    taskDeadline: document.getElementById('task-deadline'),
    taskPriority: document.getElementById('task-priority'),
    taskSkills: document.getElementById('task-skills'),
    todoTasks: document.getElementById('todo-tasks'),
    inProgressTasks: document.getElementById('in-progress-tasks'),
    completedTasks: document.getElementById('completed-tasks'),
    chatChannels: document.getElementById('chat-channels'),
    directMessages: document.getElementById('direct-messages'),
    currentChannelDisplay: document.getElementById('current-channel'),
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendMessageBtn: document.getElementById('send-message-btn'),
    fileList: document.getElementById('file-list'),
    fileUpload: document.getElementById('file-upload'),
    uploadFileBtn: document.getElementById('upload-file-btn'),
    contributionTableBody: document.getElementById('contribution-table-body'),
    memberDetailsCard: document.getElementById('member-details-card'),
    taskSearch: document.getElementById('task-search'),
    taskPriorityFilter: document.getElementById('task-priority-filter'),
    fileSearch: document.getElementById('file-search'),
    fileTypeFilter: document.getElementById('file-type-filter'),
    contributionPeriod: document.getElementById('contribution-period')
};

// Initialize the application
function init() {
    // Set current user name
    domElements.currentUserName.textContent = appState.currentUser.name;

    // Populate skills checkboxes in create task form
    populateSkillsCheckboxes();

    // Populate direct messages list
    populateDirectMessages();

    // Set up event listeners
    setupEventListeners();

    // Load dummy data
    loadDummyData();

    // Update dashboard
    updateDashboard();

    // Show initial section
    showSection('dashboard');
}

// Populate skills checkboxes in the create task form
function populateSkillsCheckboxes() {
    domElements.taskSkills.innerHTML = '';
    appState.availableSkills.forEach(skill => {
        const div = document.createElement('div');
        div.innerHTML = `
            <input type="checkbox" id="skill-${skill}" name="${skill}" value="${skill}">
            <label for="skill-${skill}">${skill.charAt(0).toUpperCase() + skill.slice(1)}</label>
        `;
        domElements.taskSkills.appendChild(div);
    });
}

// Populate direct messages list
function populateDirectMessages() {
    domElements.directMessages.innerHTML = '';
    appState.teamMembers.forEach(member => {
        if (member.id !== appState.currentUser.id) {
            const li = document.createElement('li');
            li.textContent = member.name;
            li.dataset.userId = member.id;
            domElements.directMessages.appendChild(li);
        }
    });
}

// Set up all event listeners
function setupEventListeners() {
    // Navigation buttons
    domElements.navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            showSection(section);
            updateActiveNavButton(button);
        });
    });

    // Create task button
    domElements.createTaskBtn.addEventListener('click', () => {
        domElements.createTaskModal.style.display = 'block';
    });

    // Assign tasks button
    domElements.assignTasksBtn.addEventListener('click', autoAssignTasks);

    // Create task form
    domElements.createTaskForm.addEventListener('submit', createTask);

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Chat channel selection
    domElements.chatChannels.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            appState.currentChannel = e.target.dataset.channel;
            domElements.currentChannelDisplay.textContent = `# ${appState.currentChannel.charAt(0).toUpperCase() + appState.currentChannel.slice(1)}`;
            updateActiveChatChannel(e.target);
            renderMessages();
        }
    });

    // Direct message selection
    domElements.directMessages.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            appState.currentChannel = `dm-${e.target.dataset.userId}`;
            const recipient = appState.teamMembers.find(m => m.id === e.target.dataset.userId);
            domElements.currentChannelDisplay.textContent = `${recipient.name}`;
            updateActiveChatChannel(e.target);
            renderMessages();
        }
    });

    // Send message button
    domElements.sendMessageBtn.addEventListener('click', sendMessage);

    // Message input (Enter key)
    domElements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Upload file button
    domElements.uploadFileBtn.addEventListener('click', uploadFiles);

    // Task search
    domElements.taskSearch.addEventListener('input', renderTasks);

    // Task priority filter
    domElements.taskPriorityFilter.addEventListener('change', renderTasks);

    // File search
    domElements.fileSearch.addEventListener('input', renderFiles);

    // File type filter
    domElements.fileTypeFilter.addEventListener('change', renderFiles);

    // Contribution period filter
    domElements.contributionPeriod.addEventListener('change', renderContributions);

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Show a specific section
function showSection(sectionId) {
    // Hide all sections
    Object.values(domElements.sections).forEach(section => {
        section.classList.remove('active');
    });

    // Show the selected section
    domElements.sections[sectionId].classList.add('active');

    // Update content when section becomes active
    switch (sectionId) {
        case 'tasks':
            renderTasks();
            break;
        case 'chat':
            renderMessages();
            break;
        case 'files':
            renderFiles();
            break;
        case 'contributions':
            renderContributions();
            break;
    }
}

// Update active navigation button
function updateActiveNavButton(activeButton) {
    domElements.navButtons.forEach(button => {
        button.classList.remove('active');
    });
    activeButton.classList.add('active');
}

// Update active chat channel
function updateActiveChatChannel(activeChannel) {
    const parent = activeChannel.parentNode;
    Array.from(parent.children).forEach(child => {
        child.classList.remove('active');
    });
    activeChannel.classList.add('active');
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Load dummy data for demonstration
function loadDummyData() {
    // Add some dummy tasks
    const dummyTasks = [
        {
            id: 'task1',
            title: 'Research Project Topic',
            description: 'Find and summarize 5 relevant research papers on our project topic.',
            deadline: '2023-12-15',
            priority: 'high',
            requiredSkills: ['research'],
            status: 'completed',
            assignee: 'user1',
            createdBy: 'user1',
            createdAt: '2023-11-01'
        },
        {
            id: 'task2',
            title: 'Create Project Outline',
            description: 'Develop a detailed outline for our project report.',
            deadline: '2023-12-20',
            priority: 'medium',
            requiredSkills: ['writing'],
            status: 'in-progress',
            assignee: 'user3',
            createdBy: 'user1',
            createdAt: '2023-11-05'
        },
        {
            id: 'task3',
            title: 'Develop Data Analysis Script',
            description: 'Write Python scripts to analyze our collected data.',
            deadline: '2023-12-25',
            priority: 'high',
            requiredSkills: ['coding', 'data analysis'],
            status: 'todo',
            assignee: null,
            createdBy: 'user2',
            createdAt: '2023-11-10'
        },
        {
            id: 'task4',
            title: 'Design Presentation Slides',
            description: 'Create visually appealing slides for our final presentation.',
            deadline: '2024-01-05',
            priority: 'medium',
            requiredSkills: ['design', 'presentation'],
            status: 'todo',
            assignee: null,
            createdBy: 'user3',
            createdAt: '2023-11-12'
        },
        {
            id: 'task5',
            title: 'Write Introduction Section',
            description: 'Write the introduction section of our report (500-700 words).',
            deadline: '2023-12-18',
            priority: 'low',
            requiredSkills: ['writing'],
            status: 'in-progress',
            assignee: 'user1',
            createdBy: 'user1',
            createdAt: '2023-11-15'
        }
    ];

    // Add some dummy messages
    const dummyMessages = [
        {
            id: 'msg1',
            channel: 'general',
            sender: 'user1',
            content: 'Hello everyone! Let\'s get started on our project.',
            timestamp: '2023-11-01T10:00:00',
            readBy: ['user1', 'user2', 'user3', 'user4']
        },
        {
            id: 'msg2',
            channel: 'general',
            sender: 'user2',
            content: 'I\'ve started looking into the research papers. There are some interesting findings!',
            timestamp: '2023-11-02T11:30:00',
            readBy: ['user1', 'user2', 'user3', 'user4']
        },
        {
            id: 'msg3',
            channel: 'research',
            sender: 'user1',
            content: 'I found a great paper on our topic. I\'ll share the link in the files section.',
            timestamp: '2023-11-03T09:15:00',
            readBy: ['user1', 'user2', 'user3']
        },
        {
            id: 'msg4',
            channel: 'dm-user2',
            sender: 'user1',
            content: 'Hey Alex, can you help me with the data analysis part?',
            timestamp: '2023-11-05T14:20:00',
            readBy: ['user1', 'user2']
        },
        {
            id: 'msg5',
            channel: 'dm-user2',
            sender: 'user2',
            content: 'Sure Phát, I\'ll look into it after I finish the current task.',
            timestamp: '2023-11-05T14:25:00',
            readBy: ['user1', 'user2']
        }
    ];

    // Add some dummy files
    const dummyFiles = [
        {
            id: 'file1',
            name: 'Project_Outline.docx',
            type: 'doc',
            size: '45 KB',
            uploadedBy: 'user3',
            uploadedAt: '2023-11-05T10:15:00',
            url: '#'
        },
        {
            id: 'file2',
            name: 'Research_Paper_1.pdf',
            type: 'pdf',
            size: '2.3 MB',
            uploadedBy: 'user1',
            uploadedAt: '2023-11-03T16:30:00',
            url: '#'
        },
        {
            id: 'file3',
            name: 'Data_Analysis_Script.py',
            type: 'code',
            size: '12 KB',
            uploadedBy: 'user2',
            uploadedAt: '2023-11-10T11:45:00',
            url: '#'
        },
        {
            id: 'file4',
            name: 'Presentation_Draft.pptx',
            type: 'ppt',
            size: '1.8 MB',
            uploadedBy: 'user3',
            uploadedAt: '2023-11-12T14:20:00',
            url: '#'
        },
        {
            id: 'file5',
            name: 'Team_Photo.jpg',
            type: 'image',
            size: '3.2 MB',
            uploadedBy: 'user1',
            uploadedAt: '2023-11-01T09:05:00',
            url: '#'
        }
    ];

    // Update team member stats based on dummy data
    appState.teamMembers[0].tasksCompleted = 1;
    appState.teamMembers[0].tasksAssigned = 2;
    appState.teamMembers[0].messagesSent = 3;

    appState.teamMembers[1].tasksCompleted = 0;
    appState.teamMembers[1].tasksAssigned = 1;
    appState.teamMembers[1].messagesSent = 2;

    appState.teamMembers[2].tasksCompleted = 0;
    appState.teamMembers[2].tasksAssigned = 2;
    appState.teamMembers[2].messagesSent = 1;

    appState.teamMembers[3].tasksCompleted = 0;
    appState.teamMembers[3].tasksAssigned = 0;
    appState.teamMembers[3].messagesSent = 0;

    // Add dummy data to state
    appState.tasks = dummyTasks;
    appState.messages = dummyMessages;
    appState.files = dummyFiles;

    // Calculate contribution percentages
    calculateContributionPercentages();
}

// Update dashboard statistics
function updateDashboard() {
    // Count active tasks (not completed)
    const activeTasks = appState.tasks.filter(task => task.status !== 'completed');
    domElements.activeTasksCount.textContent = activeTasks.length;

    // Find upcoming deadlines
    const today = new Date();
    const upcomingTasks = appState.tasks
        .filter(task => task.status !== 'completed')
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);

    if (upcomingTasks.length > 0) {
        const deadlineText = upcomingTasks.map(task => {
            const deadlineDate = new Date(task.deadline);
            return `${task.title} (${deadlineDate.toLocaleDateString()})`;
        }).join(', ');
        domElements.upcomingDeadlines.textContent = deadlineText;
    } else {
        domElements.upcomingDeadlines.textContent = 'None';
    }

    // Update contribution chart (simple text version)
    const ctx = domElements.contributionChart.getContext('2d');
    // In a real implementation, you would draw a chart here
    // For this prototype, we'll just show a placeholder
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, domElements.contributionChart.width, domElements.contributionChart.height);
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('Contribution Chart', 10, 20);
    ctx.fillText('(Visualization placeholder)', 10, 40);
}

// Create a new task
function createTask(e) {
    e.preventDefault();

    const title = domElements.taskTitle.value;
    const description = domElements.taskDescription.value;
    const deadline = domElements.taskDeadline.value;
    const priority = domElements.taskPriority.value;

    // Get selected skills
    const selectedSkills = [];
    appState.availableSkills.forEach(skill => {
        const checkbox = document.getElementById(`skill-${skill}`);
        if (checkbox && checkbox.checked) {
            selectedSkills.push(skill);
        }
    });

    // Create new task object
    const newTask = {
        id: `task${appState.tasks.length + 1}`,
        title,
        description,
        deadline,
        priority,
        requiredSkills: selectedSkills,
        status: 'todo',
        assignee: null,
        createdBy: appState.currentUser.id,
        createdAt: new Date().toISOString().split('T')[0]
    };

    // Add to tasks array
    appState.tasks.push(newTask);

    // Reset form and close modal
    domElements.createTaskForm.reset();
    closeAllModals();

    // Update UI
    renderTasks();
    updateDashboard();

    // Show success message
    alert('Task created successfully!');
}

// Auto-assign tasks to team members
function autoAssignTasks() {
    // Get unassigned tasks
    const unassignedTasks = appState.tasks.filter(task => !task.assignee && task.status === 'todo');

    if (unassignedTasks.length === 0) {
        alert('No unassigned tasks to distribute.');
        return;
    }

    // Assign each task to the best suited member
    unassignedTasks.forEach(task => {
        // Find member with most matching skills and least current tasks
        let bestMember = null;
        let bestScore = -1;

        appState.teamMembers.forEach(member => {
            // Skip if member already has this task (shouldn't happen)
            if (member.id === task.assignee) return;

            // Calculate skill match score
            let skillScore = 0;
            task.requiredSkills.forEach(skill => {
                if (member.skills.includes(skill)) {
                    skillScore++;
                }
            });

            // Calculate workload factor (lower is better)
            const workloadFactor = 1 / (member.tasksAssigned + 1);

            // Combined score
            const totalScore = skillScore * workloadFactor;

            // If this is the best score so far, or if scores are equal but this member has fewer tasks
            if (totalScore > bestScore ||
                (totalScore === bestScore && member.tasksAssigned < appState.teamMembers.find(m => m.id === bestMember).tasksAssigned)) {
                bestScore = totalScore;
                bestMember = member.id;
            }
        });

        // Assign the task if we found a suitable member
        if (bestMember) {
            task.assignee = bestMember;
            const memberIndex = appState.teamMembers.findIndex(m => m.id === bestMember);
            appState.teamMembers[memberIndex].tasksAssigned++;
        }
    });

    // Update UI
    renderTasks();
    updateDashboard();
    renderContributions();

    // Show success message
    alert(`Auto-assigned ${unassignedTasks.length} task(s) to team members.`);
}

// Render tasks to the task board
function renderTasks() {
    // Filter tasks based on search and priority
    const searchTerm = domElements.taskSearch.value.toLowerCase();
    const priorityFilter = domElements.taskPriorityFilter.value;

    let filteredTasks = appState.tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                             task.description.toLowerCase().includes(searchTerm);
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });

    // Clear task lists
    domElements.todoTasks.innerHTML = '';
    domElements.inProgressTasks.innerHTML = '';
    domElements.completedTasks.innerHTML = '';

    // Group tasks by status
    const todoTasks = filteredTasks.filter(task => task.status === 'todo');
    const inProgressTasks = filteredTasks.filter(task => task.status === 'in-progress');
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');

    // Render tasks in each column
    renderTaskList(todoTasks, domElements.todoTasks, 'todo');
    renderTaskList(inProgressTasks, domElements.inProgressTasks, 'in-progress');
    renderTaskList(completedTasks, domElements.completedTasks, 'completed');

    // Set up drag and drop for tasks
    setupTaskDragAndDrop();
}

// Render a list of tasks
function renderTaskList(tasks, container, status) {
    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.dataset.taskId = task.id;
        taskElement.draggable = true;

        // Find assignee details
        const assignee = task.assignee ?
            appState.teamMembers.find(member => member.id === task.assignee) :
            null;

        // Find creator details
        const creator = appState.teamMembers.find(member => member.id === task.createdBy);

        taskElement.innerHTML = `
            <h4>${task.title} <span class="task-priority priority-${task.priority}">${task.priority}</span></h4>
            <p>${task.description}</p>
            <div class="task-deadline">Deadline: ${new Date(task.deadline).toLocaleDateString()}</div>
            ${assignee ?
                `<div class="task-assignee">
                    <img src="${assignee.avatar}" alt="${assignee.name}">
                    <span>${assignee.name}</span>
                </div>` :
                '<div class="task-assignee">Unassigned</div>'
            }
            <div class="task-creator">Created by: ${creator.name}</div>
        `;

        container.appendChild(taskElement);

        // Add click event to show task details
        taskElement.addEventListener('click', () => {
            showTaskDetails(task);
        });
    });
}

// Set up drag and drop for tasks
function setupTaskDragAndDrop() {
    const taskCards = document.querySelectorAll('.task-card');
    const columns = document.querySelectorAll('.task-column');

    let draggedTask = null;

    // Add event listeners for drag and drop
    taskCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedTask = card.dataset.taskId;
            e.dataTransfer.setData('text/plain', draggedTask);
            setTimeout(() => {
                card.style.display = 'none';
            }, 0);
        });

        card.addEventListener('dragend', () => {
            setTimeout(() => {
                card.style.display = 'block';
            }, 0);
        });
    });

    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = column.dataset.status;

            // Update task status
            const taskIndex = appState.tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                // If moving to completed, update assignee's completed tasks
                if (newStatus === 'completed' && appState.tasks[taskIndex].status !== 'completed') {
                    const assigneeId = appState.tasks[taskIndex].assignee;
                    if (assigneeId) {
                        const memberIndex = appState.teamMembers.findIndex(m => m.id === assigneeId);
                        if (memberIndex !== -1) {
                            appState.teamMembers[memberIndex].tasksCompleted++;
                            appState.teamMembers[memberIndex].tasksAssigned--;
                        }
                    }
                }

                // If moving from completed, update assignee's completed tasks
                if (appState.tasks[taskIndex].status === 'completed' && newStatus !== 'completed') {
                    const assigneeId = appState.tasks[taskIndex].assignee;
                    if (assigneeId) {
                        const memberIndex = appState.teamMembers.findIndex(m => m.id === assigneeId);
                        if (memberIndex !== -1) {
                            appState.teamMembers[memberIndex].tasksCompleted--;
                            appState.teamMembers[memberIndex].tasksAssigned++;
                        }
                    }
                }

                // Update task status
                appState.tasks[taskIndex].status = newStatus;
            }

            // Re-render tasks
            renderTasks();
            updateDashboard();
            renderContributions();
        });
    });
}

// Show task details in modal
function showTaskDetails(task) {
    // Find assignee details
    const assignee = task.assignee ?
        appState.teamMembers.find(member => member.id === task.assignee) :
        null;

    // Find creator details
    const creator = appState.teamMembers.find(member => member.id === task.createdBy);

    // Format skills list
    const skillsList = task.requiredSkills.map(skill =>
        `<span class="skill-tag">${skill}</span>`
    ).join('');

    // Set modal content
    domElements.taskDetailsModal.querySelector('#task-details-title').textContent = task.title;
    domElements.taskDetailsModal.querySelector('#task-details-content').innerHTML = `
        <div class="task-detail-item">
            <strong>Description:</strong>
            <p>${task.description}</p>
        </div>
        <div class="task-detail-item">
            <strong>Deadline:</strong>
            <p>${new Date(task.deadline).toLocaleDateString()}</p>
        </div>
        <div class="task-detail-item">
            <strong>Priority:</strong>
            <p><span class="task-priority priority-${task.priority}">${task.priority}</span></p>
        </div>
        <div class="task-detail-item">
            <strong>Required Skills:</strong>
            <div class="skills-list">${skillsList}</div>
        </div>
        <div class="task-detail-item">
            <strong>Status:</strong>
            <p>${task.status.replace('-', ' ')}</p>
        </div>
        <div class="task-detail-item">
            <strong>Assignee:</strong>
            <p>${assignee ? `${assignee.name} (${assignee.skills.join(', ')})` : 'Unassigned'}</p>
        </div>
        <div class="task-detail-item">
            <strong>Created by:</strong>
            <p>${creator.name} on ${new Date(task.createdAt).toLocaleDateString()}</p>
        </div>
    `;

    // Show modal
    domElements.taskDetailsModal.style.display = 'block';
}

// Render messages in the chat
function renderMessages() {
    domElements.chatMessages.innerHTML = '';

    // Filter messages for current channel
    const channelMessages = appState.messages.filter(msg => msg.channel === appState.currentChannel);

    // Sort messages by timestamp
    channelMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Render each message
    channelMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message`;

        const sender = appState.teamMembers.find(member => member.id === message.sender);
        const isCurrentUser = message.sender === appState.currentUser.id;

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender.name}</span>
                <span class="message-time">${new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div class="message-content ${isCurrentUser ? 'user' : 'other'}">
                ${message.content}
            </div>
        `;

        domElements.chatMessages.appendChild(messageElement);
    });

    // Scroll to bottom
    domElements.chatMessages.scrollTop = domElements.chatMessages.scrollHeight;
}

// Send a new message
function sendMessage() {
    const content = domElements.messageInput.value.trim();
    if (!content) return;

    // Create new message
    const newMessage = {
        id: `msg${appState.messages.length + 1}`,
        channel: appState.currentChannel,
        sender: appState.currentUser.id,
        content,
        timestamp: new Date().toISOString(),
        readBy: [appState.currentUser.id]
    };

    // Add to messages array
    appState.messages.push(newMessage);

    // Update sender's message count
    const senderIndex = appState.teamMembers.findIndex(m => m.id === appState.currentUser.id);
    if (senderIndex !== -1) {
        appState.teamMembers[senderIndex].messagesSent++;
    }

    // Clear input and render messages
    domElements.messageInput.value = '';
    renderMessages();

    // Update contributions
    renderContributions();
}

// Render files in the file sharing section
function renderFiles() {
    domElements.fileList.innerHTML = '';

    // Filter files based on search and type
    const searchTerm = domElements.fileSearch.value.toLowerCase();
    const typeFilter = domElements.fileTypeFilter.value;

    let filteredFiles = appState.files.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm);
        const matchesType = typeFilter === 'all' ||
                           (typeFilter === 'pdf' && file.type === 'pdf') ||
                           (typeFilter === 'doc' && file.type === 'doc') ||
                           (typeFilter === 'ppt' && file.type === 'ppt') ||
                           (typeFilter === 'image' && file.type === 'image');
        return matchesSearch && matchesType;
    });

    // Sort files by upload date (newest first)
    filteredFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // Render each file
    filteredFiles.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-card';

        // Determine file icon
        let fileIcon = 'far fa-file';
        if (file.type === 'pdf') fileIcon = 'far fa-file-pdf';
        if (file.type === 'doc') fileIcon = 'far fa-file-word';
        if (file.type === 'ppt') fileIcon = 'far fa-file-powerpoint';
        if (file.type === 'image') fileIcon = 'far fa-file-image';
        if (file.type === 'code') fileIcon = 'far fa-file-code';

        // Find uploader details
        const uploader = appState.teamMembers.find(member => member.id === file.uploadedBy);

        fileElement.innerHTML = `
            <div class="file-icon">
                <i class="${fileIcon}"></i>
            </div>
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-size">${file.size}</div>
            <div class="file-uploader">Uploaded by: ${uploader.name}</div>
            <div class="file-date">${new Date(file.uploadedAt).toLocaleDateString()}</div>
        `;

        domElements.fileList.appendChild(fileElement);
    });
}

// Upload files (simulated)
function uploadFiles() {
    const files = domElements.fileUpload.files;
    if (files.length === 0) return;

    // In a real app, you would upload files to a server
    // For this prototype, we'll just add them to our state

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Determine file type
        let fileType = 'other';
        if (file.name.endsWith('.pdf')) fileType = 'pdf';
        if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) fileType = 'doc';
        if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) fileType = 'ppt';
        if (file.name.match(/\.(jpg|jpeg|png|gif)$/i)) fileType = 'image';
        if (file.name.match(/\.(js|py|java|cpp|html|css)$/i)) fileType = 'code';

        // Create file object
        const newFile = {
            id: `file${appState.files.length + 1 + i}`,
            name: file.name,
            type: fileType,
            size: formatFileSize(file.size),
            uploadedBy: appState.currentUser.id,
            uploadedAt: new Date().toISOString(),
            url: '#'
        };

        // Add to files array
        appState.files.push(newFile);
    }

    // Clear file input and render files
    domElements.fileUpload.value = '';
    renderFiles();

    // Show success message
    alert(`${files.length} file(s) uploaded successfully!`);
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Render contributions in the contributions section
function renderContributions() {
    domElements.contributionTableBody.innerHTML = '';

    // Calculate total tasks completed, assigned, and messages sent
    const totalTasksCompleted = appState.teamMembers.reduce((sum, member) => sum + member.tasksCompleted, 0);
    const totalTasksAssigned = appState.teamMembers.reduce((sum, member) => sum + member.tasksAssigned, 0);
    const totalMessagesSent = appState.teamMembers.reduce((sum, member) => sum + member.messagesSent, 0);

    // Sort members by contribution percentage (descending)
    const sortedMembers = [...appState.teamMembers].sort((a, b) => b.contributionPercentage - a.contributionPercentage);

    // Render each member's contribution
    sortedMembers.forEach(member => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${member.name}</td>
            <td>${member.tasksCompleted}</td>
            <td>${member.tasksAssigned}</td>
            <td>${member.messagesSent}</td>
            <td>${member.contributionPercentage.toFixed(1)}%</td>
        `;

        domElements.contributionTableBody.appendChild(row);

        // Add click event to show member details
        row.addEventListener('click', () => {
            showMemberDetails(member);
        });
    });

    // Show details for the first member by default
    if (sortedMembers.length > 0) {
        showMemberDetails(sortedMembers[0]);
    }
}

// Show member details in the contributions section
function showMemberDetails(member) {
    // Format skills list
    const skillsList = member.skills.map(skill =>
        `<span class="skill-tag">${skill}</span>`
    ).join('');

    // Set card content
    domElements.memberDetailsCard.innerHTML = `
        <div class="member-info">
            <img src="${member.avatar}" alt="${member.name}">
            <div>
                <h3>${member.name}</h3>
                <p>Team Member</p>
            </div>
        </div>
        <div class="member-stats">
            <div class="stat-item">
                <strong>Tasks Completed:</strong> ${member.tasksCompleted}
            </div>
            <div class="stat-item">
                <strong>Tasks Assigned:</strong> ${member.tasksAssigned}
            </div>
            <div class="stat-item">
                <strong>Messages Sent:</strong> ${member.messagesSent}
            </div>
            <div class="stat-item">
                <strong>Contribution:</strong> ${member.contributionPercentage.toFixed(1)}%
            </div>
        </div>
        <div class="member-skills">
            <strong>Skills:</strong>
            <div class="skills-list">${skillsList}</div>
        </div>
    `;
}

// Calculate contribution percentages for all team members
function calculateContributionPercentages() {
    // Calculate total contribution points
    // Each completed task = 3 points, assigned task = 1 point, message = 0.5 points
    let totalPoints = 0;

    appState.teamMembers.forEach(member => {
        totalPoints += member.tasksCompleted * 3;
        totalPoints += member.tasksAssigned * 1;
        totalPoints += member.messagesSent * 0.5;
    });

    // Calculate each member's percentage
    appState.teamMembers.forEach(member => {
        const memberPoints = member.tasksCompleted * 3 +
                           member.tasksAssigned * 1 +
                           member.messagesSent * 0.5;
        member.contributionPercentage = totalPoints > 0 ? (memberPoints / totalPoints) * 100 : 0;
    });
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);
