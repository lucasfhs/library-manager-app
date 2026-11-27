const RepositoryApiUser = require("../repositories/apiUser");
const RepositoryUser = require("../repositories/user");
const jwt = require("jsonwebtoken");
const util = require("util");

const signAsync = util.promisify(jwt.sign);
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const repository = new RepositoryApiUser();
const userRepository = new RepositoryUser();

class ServiceApiUser {
  get(userLogin) {
    return repository.get(userLogin);
  }

  post(userLogin, password) {
    return repository.post(userLogin, password);
  }

  delete(userLogin) {
    return repository.delete(userLogin);
  }

  update(userLogin, password) {
    return repository.update(userLogin, password);
  }

  async loginAdmin(userLogin, password) {
    try {
      const user = await this.get(userLogin);
      if (!user) {
        throw new Error("Usuario nao cadastrado");
      } else if (user.senha != password) {
        throw new Error("Senha incorreta");
      }
      return await signAsync({ userLogin, role: "operator" }, process.env.SECRET_KEY, {
        expiresIn: TOKEN_LIFETIME_SECONDS,
      });
    } catch (err) {
      throw new Error("Erro ao gerar o token JWT: " + err.message);
    }
  }

  async loginUser(cpfUser, password) {
    try {
      const user = await userRepository.get(cpfUser);
      if (!user) {
        throw new Error("Usuario nao cadastrado");
      } else if (user.senha != password) {
        throw new Error("Senha incorreta");
      }
      return await signAsync({ cpfUser, role: "reader" }, process.env.SECRET_KEY, {
        expiresIn: TOKEN_LIFETIME_SECONDS,
      });
    } catch (err) {
      throw new Error("Erro ao gerar o token JWT: " + err.message);
    }
  }
}

module.exports = ServiceApiUser;
