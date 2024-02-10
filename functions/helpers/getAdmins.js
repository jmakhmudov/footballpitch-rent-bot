const prisma = require("./prisma");

async function getAdmins() {
  const admins = await prisma.user.findMany({
    where: {
      isAdmin: true,
    }
  })

  return admins;
}

module.exports = getAdmins;