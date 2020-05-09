const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/user')
const {
    userOneId,
    userOne,
    userTwoId,
    userTwo,
    setupDatabase
} = require('./fixtures/db')

beforeEach(setupDatabase)

test('Should signup a new user', async () => {
    const response = await request(app)
    .post('/users')
    .send({
        name: 'Andrew',
        email: 'andrew@example.com',
        password: 'MyPass777!'
    })
    .expect(201)

    // Assert that the database was changed correctly
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()

    // Assertions about the response
    expect(response.body).toMatchObject({
        user: {
            name: 'Andrew',
            email: 'andrew@example.com'
        },
        token: user.tokens[0].token
    })

    expect(user.password).not.toBe('MyPass777!')
})

test('Should login existing user', async () => {
    const response = await request(app)
    .post('/users/login')
    .send({
        email: userOne.email,
        password: userOne.password
    })
    .expect(200)

    // Assert the user's new token is equal to response token
    const user = await User.findById(userOneId)
    expect(user.tokens[1].token).toBe(response.body.token)
})

test('Should not login nonexistent user', async () => {
    await request(app)
    .post('/users/login')
    .send({
        email: userOne.email,
        password: 'wrongPass'
    })
    .expect(400)
})

test('Should get profile for user', async () => {
    await request(app)
    .get('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200)
})

test('Should not get profile for user', async () => {
    await request(app)
    .get('/users/me')
    .send()
    .expect(401)
})

test('Should delete account for user', async () => {
    await request(app)
    .delete('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200)

    const user = await User.findById(userOneId)
    expect(user).toBeNull()
})

test('Should not delete account for unauthenticated user', async () => {
    await request(app)
    .delete('/users/me')
    .send()
    .expect(401)
})

test('Should upload avatar image', async () => {
    await request(app)
    .post('/users/me/avatar')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .attach('avatar', 'tests/fixtures/profile-pic.jpg')
    .expect(200)

    const user = await User.findById(userOneId)
    expect(user.avatar).toEqual(expect.any(Buffer))
})

test('Should update valid user fields', async () => {
    await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
        name: 'Sero'
    })
    .expect(200)

    const user = await User.findById(userOneId)
    expect(user.name).toEqual('Sero')
})

test('Should not update invalid user fields', async () => {
    await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
        location: 'Kadikoy'
    })
    .expect(400)
})

test('Should not signup user with invalid email', async () => {
    await request(app)
    .post('/users')
    .send({
        name: 'Osman',
        email: 'osman.com',
        password: 'MyPass777!'
    })
    .expect(400)
})

test('Should not signup user with invalid password', async () => {
    await request(app)
    .post('/users')
    .send({
        name: 'Ebubekir Sıddık',
        email: 'ebubekirsıddikhacihocaoglu@example.com',
        password: '1234'
    })
    .expect(400)
})

test('Should not signup user without name', async () => {
    await request(app)
    .post('/users')
    .send({
        email: 'ebubekirsıddikhacihocaoglu@example.com',
        password: '12345567'
    })
    .expect(400)
})

test('Should not update user if unauthenticated', async () => {
    await request(app)
    .patch('/users/me')
    .send({
        name: 'Sero'
    })
    .expect(401)
})

test('Should not update user with invalid email', async () => {
    await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
        email: userTwo.email
    })
    .expect(400)

    const user = await User.findById(userOneId)
    expect(user.email).not.toEqual(userTwo.email)
    expect(user.email).toEqual(userOne.email)
})

test('Should not update user with invalid password', async () => {
    await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
        password: '123'
    })
    .expect(400)
})

test('Should not delete user if unauthenticated', async () => {
    await request(app)
    .delete('/users/me')
    .send()
    .expect(401)
})