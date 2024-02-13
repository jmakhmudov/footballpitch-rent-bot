const prisma = require("./prisma")

const change = async () => {
  await prisma.price.create({
    data: {
      amount: 150000,
      day_type: 'A'
    }
  })
  await prisma.price.create({
    data: {
      amount: 175000,
      day_type: 'B'
    }
  })
}