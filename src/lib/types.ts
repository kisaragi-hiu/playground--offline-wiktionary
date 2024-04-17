interface BaseArticle {
  id: number;
  title: string;
  categories?: string;
  revisionId: number;
  lastModified: string;
  lastContributor: string;
}

interface ArticleRedirect extends BaseArticle {
  text: undefined;
  redirect: string;
}

interface ArticleNormal extends BaseArticle {
  text: string;
  redirect: undefined;
}

export type Article = ArticleRedirect | ArticleNormal;
