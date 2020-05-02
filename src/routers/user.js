const express = require('express')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../models/user')
const auth = require('../middleware/auth')
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account')
const router = express.Router()

router.post('/users', async ({ body }, res) => {
    const user = new User(body)
    
    try {
        await user.save()
        sendWelcomeEmail(user.email, user.name)
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/users/login', async ({ body }, res) => {
    try {
        const user = await User.findByCredentials(body.email, body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })

        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send(e)
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []

        await req.user.save()

        res.send()
    } catch (e) {
        res.status(500).send(e)
    }
})

const upload = multer({
    limits: {
        fileSize: 1*1024*1024
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Please upload an image'))
        }

        cb(undefined, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async ({ user, file}, res) => {
    try {
        const buffer = await sharp(file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
        user.avatar = buffer
        await user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message})
})

router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find({})
        res.send(users)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/users/me', auth, async ({ user }, res) => {
    res.send(user)
})

router.get('/users/:id', auth, async ({ params }, res) => {
    try {
        const user = await User.findById(params.id)
        if (!user) {
            return res.status(404).send()
        }

        res.send(user)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.get('/users/:id/avatar', async ({ params }, res) => {
    try {
        const user = await User.findById(params.id)

        if (!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/png')
        res.send(user.avatar)
    } catch (e) {
        res.status(404).send()
    }
})

router.patch('/users/me', auth, async ({ user, body}, res) => {
    const updates = Object.keys(body)
    const allowedUpdates = ['name', 'age', 'email', 'password']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) return res.status(400).send({ error: 'Invalid updates!'})

    try {
        updates.forEach((update) => user[update] = body[update])
        await user.save()
        res.send(user)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/users/me', auth, async ({ user }, res) => {
    try {
        await user.remove()
        sendCancelationEmail(user.email, user.name)
        res.send(user)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.delete('/users/me/avatar', auth, async ({ user }, res) => {
    try {
        user.avatar = undefined
        await user.save()
        res.send(user)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router