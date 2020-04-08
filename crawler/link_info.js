class LinkInfo {
	constructor({url = '', prevURL = '', title = '', keyword = '', icon = '', group = 0} = {}) {
    this.url = url;
    this.prevURL = prevURL;
    this.title = title;
    this.keyword = keyword;
    this.icon = icon;
    this.group = group;
	}

	get() {
    return {
      url: this.url,
      prevURL: this.prevURL,
      title: this.title,
      keyword: this.keywordFound,
      icon: this.icon,
      group: this.group
    }; 
	}
	
	getAndUpdate({
    url = this.url, 
    prevURL = this.prevURL, 
    title = this.title, 
    keyword = this.keywordFound, 
    icon = this.icon, 
    group = this.group} = {}
  ) {
    
    this.url = url;
    this.prevURL = prevURL;
    this.title = title;
    this.keyword = keyword;
    this.icon = icon;
    this.group = group;
    
    return {
      url: this.url,
      prevURL: this.prevURL,
      title: this.title,
      keyword: this.keywordFound,
      icon: this.icon,
      group: this.group
    }; 
	}
}

module.exports = LinkInfo;
