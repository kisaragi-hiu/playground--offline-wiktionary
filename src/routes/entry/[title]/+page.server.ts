import { getExactArticle } from "$lib";
import { redirect } from "@sveltejs/kit";

export function load({ params }) {
  const article = getExactArticle(params.title);
  if (typeof article.redirect === "string") {
    redirect(307, article.redirect);
  }
  return { title: params.title, text: article.text };
}
