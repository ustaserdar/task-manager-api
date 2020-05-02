const express = require('express')
const Task = require('../models/task')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/tasks', auth, async ({ body, user }, res) => {
    const task = new Task({
        ...body,
        owner: user._id
    })

    try {
        await task.save()
        res.status(201).send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET /tasks?completed=true
// GET /tasks?limit=10&skip=0
// GET /tasks?sortBy=createdAt_desc
router.get('/tasks', auth, async ({ user, query }, res) => {
    const match = {}
    const sort = {}

    if (query.completed) {
        match.completed = query.completed === 'true'
    }
    if (query.sortBy) {
        const parts = query.sortBy.split('_')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        await user.populate({ 
            path: 'tasks',
            match,
            options: {
                limit: parseInt(query.limit),
                skip: parseInt(query.skip),
                sort
            }
        }).execPopulate()
        res.send(user.tasks)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/tasks/:id', auth, async ({ params, user }, res) => {
    try {
        const task = await Task.findOne({ _id: params.id, owner: user._id})

        if (!task) {
            return res.status(404).send()
        }

        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch('/tasks/:id', auth, async ({ params, user, body }, res) => {
    const updates = Object.keys(body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) return res.status(400).send({ error: 'Invalid updates!'})

    try {
        const task = await Task.findOne({ _id: params.id, owner: user._id})

        if (!task) {
            res.status(404).send()
        }

        updates.forEach((update) => task[update] = body[update])
        await task.save()        
        res.send(task)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/tasks/:id', auth, async ({ params, user }, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: params.id, owner: user._id})

        if (!task) {
            res.status(404).send()
        }

        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

module.exports = router