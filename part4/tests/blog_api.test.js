const mongoose = require("mongoose");
const supertest = require("supertest");
const Blog = require("../models/blog");
const helper = require("./test_helper");

const app = require("../app");

const api = supertest(app);

beforeEach(async () => {
    await Blog.deleteMany({});

    const blogObjects = helper.initialBlogs.map((blog) => new Blog(blog));
    const promiseArray = blogObjects.map((blog) => blog.save());
    await Promise.all(promiseArray);
});

test("correct number of blogs are returned as json", async () => {
    const response = await api
        .get("/api/blogs")
        .expect("Content-Type", /application\/json/)
        .expect(200);

    expect(response.body).toHaveLength(helper.initialBlogs.length);
});

test("unique identifier is id", async () => {
    const response = await api.get("/api/blogs");
    const blogs = response.body;

    for (const blog of blogs) {
        expect(blog.id).toBeDefined(); // Check if id property is defined
    }
});

test("creating a new blog post", async () => {
    const newBlog = {
        title: "Test Blog",
        author: "Test Author",
        url: "https://testblog.com",
        likes: 10,
    };

    // Get initial count of blogs
    const initialBlogs = await Blog.find({});

    // Make POST request to create a new blog
    await api.post("/api/blogs").send(newBlog).expect(201);

    // Get updated count of blogs
    const updatedBlogs = await Blog.find({});

    // Check if the total number of blogs is increased by one
    expect(updatedBlogs).toHaveLength(initialBlogs.length + 1);

    // Check if the content of the new blog is saved correctly
    const savedBlog = updatedBlogs.find((blog) => blog.title === newBlog.title && blog.author === newBlog.author);
    expect(savedBlog).toBeDefined();
});

test("likes property defaults to 0 when missing from request", async () => {
    const newBlog = {
        title: "Test Blog",
        author: "Test Author",
        url: "https://testblog.com",
    };

    const response = await api.post("/api/blogs").send(newBlog).expect(201);
    const savedBlog = response.body;

    expect(savedBlog.likes).toBe(0);
});

test("responds with 400 Bad Request if title is missing", async () => {
    const newBlog = {
        author: "Test Author",
        url: "https://testblog.com",
    };

    await api.post("/api/blogs").send(newBlog).expect(400);
});

test("responds with 400 Bad Request if url is missing", async () => {
    const newBlog = {
        title: "Test Blog",
        author: "Test Author",
    };

    await api.post("/api/blogs").send(newBlog).expect(400);
});

describe("deletion of a blog", () => {
    test("succeeds with status code 204 if id is valid", async () => {
        const blogsAtStart = await helper.blogsInDb();
        const blogToDelete = blogsAtStart[0];

        console.log("ID to Delete:", blogToDelete.id);
        await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);
        console.log("Delete Request Sent");

        const blogsAtEnd = await helper.blogsInDb();

        expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

        const titles = blogsAtEnd.map((r) => r.title);

        expect(titles).not.toContain(blogToDelete.title);
    });
});

afterAll(async () => {
    await mongoose.connection.close();
});
