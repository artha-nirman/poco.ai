// Simple infrastructure test to validate Jest setup
describe('Testing Infrastructure', () => {
  test('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  test('should handle string operations', () => {
    const text = 'Hello World'
    expect(text.toLowerCase()).toBe('hello world')
    expect(text).toContain('World')
  })

  test('should work with objects', () => {
    const user = { name: 'John', age: 30 }
    expect(user).toHaveProperty('name', 'John')
    expect(user).toMatchObject({ name: 'John', age: 30 })
  })

  test('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    await expect(promise).resolves.toBe('success')
  })

  test('should validate arrays', () => {
    const numbers = [1, 2, 3, 4, 5]
    expect(numbers).toHaveLength(5)
    expect(numbers).toContain(3)
    expect(numbers[0]).toBe(1)
  })

  test('should handle boolean logic', () => {
    expect(true).toBeTruthy()
    expect(false).toBeFalsy()
    expect(!false).toBeTruthy()
  })

  test('should work with functions', () => {
    const add = (a, b) => a + b
    expect(add(2, 3)).toBe(5)
    expect(typeof add).toBe('function')
  })

  test('should handle null and undefined', () => {
    expect(null).toBeNull()
    expect(undefined).toBeUndefined()
    expect('').not.toBeNull()
    expect(0).not.toBeUndefined()
  })
})