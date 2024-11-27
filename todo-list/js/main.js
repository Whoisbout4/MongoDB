class TodoManager {
    constructor() {
        this.todos = [];
        this.baseUrl = "http://localhost:5000/todos";
    }

    async getTodos() {
        try {
            const response = await fetch(this.baseUrl);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch todos');
            }
            const todos = await response.json();
            this.todos = todos;
            return todos;
        } catch (error) {
            console.error('Error details:', error);
            throw new Error('Network error or server is not running');
        }
    }

    async addTodo(task, dueDate) {
        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ task, dueDate }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add todo');
            }
            
            const newTodo = await response.json();
            this.todos.push(newTodo);
            return newTodo;
        } catch (error) {
            console.error('Error adding todo:', error);
            throw error;
        }
    }

    async deleteTodo(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, { 
                method: "DELETE",
                headers: { "Accept": "application/json" }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete todo');
            }
            
            this.todos = this.todos.filter((todo) => todo._id !== id);
        } catch (error) {
            console.error('Error deleting todo:', error);
            throw error;
        }
    }

    async toggleTodoStatus(id) {
        try {
            const todo = this.todos.find((t) => t._id === id);
            if (!todo) {
                throw new Error('Todo not found');
            }

            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    status: todo.status === "pending" ? "completed" : "pending",
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update todo status');
            }

            const updated = await response.json();
            const index = this.todos.findIndex(t => t._id === id);
            if (index !== -1) {
                this.todos[index] = updated;
            }
            return updated;
        } catch (error) {
            console.error('Error toggling todo status:', error);
            throw error;
        }
    }

    async editTodo(id, task, dueDate) {
        try {
            console.log('Sending edit request:', { id, task, dueDate });
            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ 
                    task: task, 
                    dueDate: dueDate 
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to edit todo');
            }
            
            const updatedTodo = await response.json();
            console.log('Received updated todo:', updatedTodo);

            const index = this.todos.findIndex(t => t._id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
            }
            return updatedTodo;
        } catch (error) {
            console.error('Error editing todo:', error);
            throw error;
        }
    }
}

class UIManager {
    constructor(todoManager) {
        this.todoManager = todoManager;
        this.taskInput = document.querySelector('input[type="text"]');
        this.dateInput = document.querySelector('input[type="date"]');
        this.todoListBody = document.querySelector(".todos-list-body");
        this.alertMessage = document.querySelector(".alert-message");
        this.addButton = document.querySelector(".add-task-button");
        this.init();
    }

    showAlertMessage(message, type) {
        this.alertMessage.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => (this.alertMessage.innerHTML = ""), 3000);
    }

    async displayTodos(todos) {
        this.todoListBody.innerHTML = "";
        todos.forEach((todo) => {
            const row = document.createElement("tr");
            const dueDate = new Date(todo.dueDate).toISOString().split('T')[0];
            row.innerHTML = `
                <td class="task-cell">${todo.task}</td>
                <td>${new Date(todo.dueDate).toLocaleDateString()}</td>
                <td>${todo.status}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editTask('${todo._id}', this)">Edit</button>
                    <button class="btn btn-sm btn-success" onclick="toggleStatus('${todo._id}')">Toggle</button>
                    <button class="btn btn-sm btn-error" onclick="deleteTask('${todo._id}')">Delete</button>
                </td>
            `;
            row.dataset.dueDate = dueDate;
            this.todoListBody.appendChild(row);
        });
    }

    async handleAddTodo() {
        const task = this.taskInput.value.trim();
        const dueDate = this.dateInput.value;

        if (!task || !dueDate) {
            this.showAlertMessage("Please enter both task and due date", "error");
            return;
        }

        try {
            await this.todoManager.addTodo(task, dueDate);
            this.taskInput.value = "";
            this.dateInput.value = "";
            const todos = await this.todoManager.getTodos();
            this.displayTodos(todos);
            this.showAlertMessage("Task added successfully!", "success");
        } catch (err) {
            console.error('Error in handleAddTodo:', err);
            this.showAlertMessage(err.message || "Failed to add task", "error");
        }
    }

    async handleEditTodo(id, task, dueDate) {
        try {
            console.log('Handling edit todo:', { id, task, dueDate });
            await this.todoManager.editTodo(id, task, dueDate);
            
            const todos = await this.todoManager.getTodos();
            await this.displayTodos(todos);
            this.showAlertMessage("Task updated successfully!", "success");
        } catch (err) {
            console.error('Error in handleEditTodo:', err);
            this.showAlertMessage("Failed to update task", "error");
        }
    }

    init() {
        this.addButton.addEventListener("click", () => this.handleAddTodo());
        console.log('Initializing UI and fetching todos...');
        this.todoManager.getTodos()
            .then(todos => {
                console.log('Todos fetched successfully:', todos);
                this.displayTodos(todos);
            })
            .catch(error => {
                console.error('Detailed error:', error);
                this.showAlertMessage(error.message, "error");
            });
    }
}

// Khởi tạo các instance
const todoManager = new TodoManager();
const uiManager = new UIManager(todoManager);

// Global functions
window.toggleStatus = async (id) => {
    try {
        await todoManager.toggleTodoStatus(id);
        const todos = await todoManager.getTodos();
        uiManager.displayTodos(todos);
    } catch (error) {
        uiManager.showAlertMessage("Failed to toggle status", "error");
    }
};

window.deleteTask = async (id) => {
    try {
        await todoManager.deleteTodo(id);
        const todos = await todoManager.getTodos();
        uiManager.displayTodos(todos);
        uiManager.showAlertMessage("Task deleted successfully", "success");
    } catch (error) {
        uiManager.showAlertMessage("Failed to delete task", "error");
    }
};

window.editTask = (id, buttonElement) => {
    const row = buttonElement.closest('tr');
    const taskCell = row.querySelector('.task-cell');
    const originalTask = taskCell.textContent;
    const originalDueDate = row.dataset.dueDate;

    taskCell.innerHTML = `
        <div class="edit-form">
            <input type="text" class="input input-bordered input-sm" value="${originalTask}">
            <input type="date" class="input input-bordered input-sm" value="${originalDueDate}">
            <button class="btn btn-sm btn-success" onclick="saveEdit('${id}', this)">Save</button>
            <button class="btn btn-sm btn-ghost" onclick="cancelEdit(this, '${originalTask}')">Cancel</button>
        </div>
    `;
};

window.saveEdit = async (id, buttonElement) => {
    const editForm = buttonElement.closest('.edit-form');
    const newTask = editForm.querySelector('input[type="text"]').value.trim();
    const newDueDate = editForm.querySelector('input[type="date"]').value;

    if (!newTask || !newDueDate) {
        uiManager.showAlertMessage("Please enter both task and due date", "error");
        return;
    }

    try {
        console.log('Saving edit:', { id, newTask, newDueDate });
        await uiManager.handleEditTodo(id, newTask, newDueDate);
    } catch (error) {
        console.error('Error in saveEdit:', error);
        uiManager.showAlertMessage("Failed to update task", "error");
    }
};

window.cancelEdit = (buttonElement, originalTask) => {
    const taskCell = buttonElement.closest('.task-cell');
    taskCell.textContent = originalTask;
};