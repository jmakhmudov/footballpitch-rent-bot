const prisma = require("./prisma");

async function checkAdmin(id) {
  const user = await prisma.user.findUnique({
    where: { id: JSON.stringify(id) }
  });
  
  return user.isAdmin;
}

module.exports = checkAdmin;