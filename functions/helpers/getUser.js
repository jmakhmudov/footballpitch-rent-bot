const prisma = require("./prisma");

async function getUser(id) {
  const user = await prisma.user.findUnique({
    where: { id: JSON.stringify(id) }
  });
  
  return user;
}

module.exports = getUser;