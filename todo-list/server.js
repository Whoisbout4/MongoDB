require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Cấu hình CORS chi tiết hơn
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true
}));

app.use(bodyParser.json());

// Kết nối MongoDB với xử lý lỗi chi tiết
mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log('Connected to MongoDB successfully'))
.catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Schema với validation
const todoSchema = new mongoose.Schema({
    task: { 
        type: String, 
        required: [true, 'Task is required'],
        trim: true
    },
    dueDate: { 
        type: Date, 
        required: [true, 'Due date is required']
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed'], 
        default: 'pending'
    },
}, {
    timestamps: true
});

const Todo = mongoose.model('Todo', todoSchema);

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// GET todos với sorting
app.get('/todos', async (req, res) => {
    try {
        const todos = await Todo.find()
            .sort({ dueDate: 1, createdAt: -1 })
            .exec();
        console.log(`Retrieved ${todos.length} todos`);
        res.json(todos);
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST new todo với validation
app.post('/todos', async (req, res) => {
    try {
        const { task, dueDate } = req.body;
        
        if (!task || !dueDate) {
            return res.status(400).json({ 
                message: 'Task and due date are required',
                details: {
                    task: !task ? 'Task is required' : null,
                    dueDate: !dueDate ? 'Due date is required' : null
                }
            });
        }

        const todo = new Todo({
            task: task.trim(),
            dueDate: new Date(dueDate),
        });

        const savedTodo = await todo.save();
        console.log('Todo created:', savedTodo);
        res.status(201).json(savedTodo);
    } catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).json({ 
            message: 'Failed to create todo',
            error: error.message 
        });
    }
});

// PUT update todo với validation
app.put('/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { task, dueDate, status } = req.body;
        
        console.log('Updating todo:', { id, task, dueDate, status });

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid todo ID format' });
        }

        const updateData = {};
        if (task !== undefined) updateData.task = task.trim();
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
        if (status !== undefined) {
            if (!['pending', 'completed'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status value' });
            }
            updateData.status = status;
        }

        console.log('Update data:', updateData);

        const updatedTodo = await Todo.findByIdAndUpdate(
            id,
            updateData,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        );

        if (!updatedTodo) {
            console.log('Todo not found:', id);
            return res.status(404).json({ message: 'Todo not found' });
        }

        console.log('Todo updated successfully:', updatedTodo);
        res.json(updatedTodo);
    } catch (error) {
        console.error('Error updating todo:', error);
        res.status(500).json({ 
            message: 'Failed to update todo',
            error: error.message 
        });
    }
});

// DELETE todo với validation
app.delete('/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid todo ID format' });
        }

        const deletedTodo = await Todo.findByIdAndDelete(id);
        if (!deletedTodo) {
            return res.status(404).json({ message: 'Todo not found' });
        }

        console.log('Todo deleted:', deletedTodo);
        res.json({ 
            message: 'Todo deleted successfully',
            deletedTodo 
        });
    } catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).json({ 
            message: 'Failed to delete todo',
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongodb: {
            status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
            database: mongoose.connection.name,
            collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections) : []
        },
        environment: {
            nodeVersion: process.version,
            platform: process.platform
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});