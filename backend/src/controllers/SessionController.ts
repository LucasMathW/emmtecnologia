import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import AuthUserService from "../services/UserServices/AuthUserService";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { RefreshTokenService } from "../services/AuthServices/RefreshTokenService";
import FindUserFromToken from "../services/AuthServices/FindUserFromToken";
import User from "../models/User";
import { SerializeUser } from "../helpers/SerializeUser";
import ResolveCompanyByDomain from "../helpers/resolveCompanyIdNyDomain";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;
  const { companyId: queryCompanyId } = req.query;

  // console.log(`queyCompanyId:${queryCompanyId}`);

  let targetCompanyId = queryCompanyId
    ? parseInt(String(queryCompanyId), 10)
    : undefined;

  if (!targetCompanyId) {
    const forwardedHost = req.headers["x-forwarded-host"];
    const origin =
      forwardedHost ||
      req.headers.host ||
      req.headers.origin ||
      req.headers.referer;

    let host: string | undefined;

    if (typeof origin === "string") {
      try {
        host = origin.startsWith("http") ? new URL(origin).host : origin;
      } catch {
        host = origin;
      }
    }

    targetCompanyId = await ResolveCompanyByDomain(host);
  }

  if (!targetCompanyId) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 400);
  }

  const { token, serializedUser, refreshToken } = await AuthUserService({
    email,
    password,
    companyId: targetCompanyId
  });

  SendRefreshToken(res, refreshToken);

  const io = getIO();

  io.of(serializedUser.companyId.toString()).emit(
    `company-${serializedUser.companyId}-auth`,
    {
      action: "update",
      user: {
        id: serializedUser.id,
        email: serializedUser.email,
        companyId: serializedUser.companyId,
        token: serializedUser.token
      }
    }
  );

  return res.status(200).json({
    token,
    user: serializedUser
  });
};

// export const store = async (req: Request, res: Response): Promise<Response> => {
//   const { email, password } = req.body;

//   const { token, serializedUser, refreshToken } = await AuthUserService({
//     email,
//     password
//   });

//   SendRefreshToken(res, refreshToken);

//   const io = getIO();

//   io.of(serializedUser.companyId.toString()).emit(
//     `company-${serializedUser.companyId}-auth`,
//     {
//       action: "update",
//       user: {
//         id: serializedUser.id,
//         email: serializedUser.email,
//         companyId: serializedUser.companyId,
//         token: serializedUser.token
//       }
//     }
//   );

//   return res.status(200).json({
//     token,
//     user: serializedUser
//   });
// };

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const token: string = req.cookies.jrt;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { user, newToken, refreshToken } = await RefreshTokenService(
    res,
    token
  );

  SendRefreshToken(res, refreshToken);

  return res.json({ token: newToken, user });
};

export const me = async (req: Request, res: Response): Promise<Response> => {
  const token: string = req.cookies.jrt;
  // const user = await FindUserFromToken(token);
  // if (!token) {
  //   throw new AppError("ERR_SESSION_EXPIRED", 401);
  // }
  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }
  const user = await FindUserFromToken(token);
  const serializedUser = await SerializeUser(user);
  return res.json({ user: serializedUser });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  console.log("REMOVE");
  const { id } = req.user;
  if (id) {
    const user = await User.findByPk(id);
    await user.update({ online: false });
  }
  res.clearCookie("jrt");

  return res.send();
};
