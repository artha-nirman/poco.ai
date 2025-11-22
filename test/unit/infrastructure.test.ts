// Simple test to validate testing infrastructure
describe('Testing Infrastructure', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    const text = 'Hello World'
    expect(text.toLowerCase()).toBe('hello world')
    expect(text).toContain('World')
  })

  it('should work with objects', () => {
    const user = { name: 'John', age: 30 }
    expect(user).toHaveProperty('name', 'John')
    expect(user).toMatchObject({ name: 'John', age: 30 })
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    await expect(promise).resolves.toBe('success')
  })
})