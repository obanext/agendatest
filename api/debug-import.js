import { BRANCHES } from "../lib/vestigingen.js";

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    branches: BRANCHES.length
  });
}
