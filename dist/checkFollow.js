module.exports=function(modules){var installedModules={};function __webpack_require__(moduleId){if(installedModules[moduleId])return installedModules[moduleId].exports;var module=installedModules[moduleId]={i:moduleId,l:!1,exports:{}};return modules[moduleId].call(module.exports,module,module.exports,__webpack_require__),module.l=!0,module.exports}return __webpack_require__.m=modules,__webpack_require__.c=installedModules,__webpack_require__.d=function(exports,name,getter){__webpack_require__.o(exports,name)||Object.defineProperty(exports,name,{enumerable:!0,get:getter})},__webpack_require__.r=function(exports){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(exports,"__esModule",{value:!0})},__webpack_require__.t=function(value,mode){if(1&mode&&(value=__webpack_require__(value)),8&mode)return value;if(4&mode&&"object"==typeof value&&value&&value.__esModule)return value;var ns=Object.create(null);if(__webpack_require__.r(ns),Object.defineProperty(ns,"default",{enumerable:!0,value:value}),2&mode&&"string"!=typeof value)for(var key in value)__webpack_require__.d(ns,key,function(key){return value[key]}.bind(null,key));return ns},__webpack_require__.n=function(module){var getter=module&&module.__esModule?function(){return module.default}:function(){return module};return __webpack_require__.d(getter,"a",getter),getter},__webpack_require__.o=function(object,property){return Object.prototype.hasOwnProperty.call(object,property)},__webpack_require__.p="",__webpack_require__(__webpack_require__.s=1)}([function(module,exports,__webpack_require__){"use strict";var __awaiter=this&&this.__awaiter||function(thisArg,_arguments,P,generator){return new(P||(P=Promise))((function(resolve,reject){function fulfilled(value){try{step(generator.next(value))}catch(e){reject(e)}}function rejected(value){try{step(generator.throw(value))}catch(e){reject(e)}}function step(result){var value;result.done?resolve(result.value):(value=result.value,value instanceof P?value:new P((function(resolve){resolve(value)}))).then(fulfilled,rejected)}step((generator=generator.apply(thisArg,_arguments||[])).next())}))},__importDefault=this&&this.__importDefault||function(mod){return mod&&mod.__esModule?mod:{default:mod}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.checkFollow=exports.concatFollowers=exports.getUnfollows=exports.getFollowers=exports.pushFreshFollow=exports.pushPromise=exports.setLogger=exports.ID=void 0;const unfollow_event_1=__webpack_require__(2),differify=new(__importDefault(__webpack_require__(3)).default)({compareArraysInOrder:!1});let logger;exports.ID={source:"bpvk-checkfollow",event:"unfollow"};const gFollows=new Array;let freshFollows=[],latestFollows=-1;exports.setLogger=log=>{logger=log};exports.pushPromise=prom=>__awaiter(void 0,void 0,void 0,(function*(){try{const latest=gFollows.push(prom);prom.then((()=>latestFollows=latest-1)),prom.catch((e=>logger.error("Bro...? checkFollow error: "+e)))}catch(e){logger.error(`pushPromise error: ${e}`)}}));exports.pushFreshFollow=freshFollow=>{freshFollows.push(freshFollow),logger.debug("pushFreshFollow ran: Date("+freshFollow.date.toString()+"), Followers("+freshFollow.followers.toString()+")")};exports.getFollowers=i=>__awaiter(void 0,void 0,void 0,(function*(){i=i||(latestFollows>=0?latestFollows:gFollows.length-1);try{return yield gFollows[i]}catch(e){logger.error(`getFollowers encountered an error @ gFollows[${i}] and is attempting rollback. Cause: ${e}`);try{if(i-1>=0)return yield exports.getFollowers(i-1);if(i!=latestFollows)return yield gFollows[latestFollows];if(gFollows.length>=1&&i!=gFollows.length-1)return yield gFollows[gFollows.length-1];throw new Error(`getFollowers rollback failed! D: Better luck next time... | Cause: ${e}`)}catch(ee){throw new Error(`getFollowers couldn't retrieve gFollows[${i}]. Cause: ${ee}`)}}}));exports.getUnfollows=em=>__awaiter(void 0,void 0,void 0,(function*(){let unfollows;const start=Date.now();try{if(gFollows.length>1){const prev=yield exports.getFollowers(latestFollows-1),cur=yield exports.getFollowers();if(cur===prev)return[];const diff=differify.compare(prev.followers,cur.followers);unfollows=(arr=>{let ret=[];for(let i=0;i<=arr.length;i++)arr[i]&&"boolean"!=typeof arr[i]&&ret.push(arr[i].original);return ret})(differify.filterDiffByStatus(diff,"DELETED",!0))}return gFollows.length>2&&gFollows.splice(0,gFollows.length-2),unfollows.length>0&&unfollow_event_1.triggerUnfollow(unfollows,em),logger.info(`[${Date.now()-start}ms] getUnfollows ran, results: ${unfollows}`),unfollows}catch(e){throw new Error(`getUnfollows encountered an error: ${e}`)}}));const roundTwo=num=>Math.round(100*(num+Number.EPSILON))/100,timer=ms=>new Promise((res=>setTimeout(res,ms)));let retries=0;const tryConcat=(client,userFollows,follows)=>__awaiter(void 0,void 0,void 0,(function*(){let start=Date.now(),flwrs=follows||[];try{let lastStep=Date.now();do{if(client.lastKnownRemainingRequests<=50){const resetTime=client.lastKnownResetDate;logger.debug(`concatFollowers is waiting to not reach rate limit. Will resume in [${resetTime.getSeconds()}s]`),yield timer(resetTime.getTime())}const data=yield userFollows.getNext();if(!data.length)break;if(flwrs=flwrs.concat(data.map((v=>v.userName))),Date.now()-lastStep>=5e3){const fLen=flwrs.length,fTot=yield userFollows.getTotalCount(),prcnt=roundTwo(fLen/fTot*100)+"%",tSecs=roundTwo((Date.now()-start)/1e3)+"s";logger.debug(`concatFollowers fetching. ${prcnt} done. Total time: [${tSecs}]. Total fetched: [${fLen}] of [${fTot}]`),lastStep=Date.now()}}while(userFollows.currentCursor);return retries=0,flwrs}catch(e){if(retries<3&&void 0!==userFollows.currentCursor)return logger.debug(`concatFollowers encountered an error while fetching. Attempting to continue... | Cause: ${e}`),yield timer(1e3),retries++,yield tryConcat(client,userFollows,flwrs);throw new Error(`tryConcat failed with 3 retries. Cause: ${e}`)}}));exports.concatFollowers=(api,flwdUser,em)=>__awaiter(void 0,void 0,void 0,(function*(){const start=Date.now(),client=api.getClient(),users=client.users,Filter={followedUser:(yield users.getUserByName(flwdUser)).id,limit:100};logger.debug(`Running concatFollowers @ [${start}]`);let flwrs=[],userFollows=users.getFollowsPaginated(Filter);Date.now();try{userFollows.reset(),flwrs=yield tryConcat(client,userFollows);const arr={date:Date.now(),followers:flwrs};return logger.info(`[${arr.date-start}ms] concatFollowers just fetched new followers list @ time [${arr.date}] with follower count [${arr.followers.length}]`),freshFollows=[],arr}catch(e){throw new Error("concatFollowers encountered an error while fetching. ")}}));exports.checkFollow=username=>__awaiter(void 0,void 0,void 0,(function*(){Date.now();const flwrs=yield exports.getFollowers();let ret=flwrs.followers.includes(username);if(!ret){let fInd=-1;const fFlws=freshFollows.find(((e,i)=>(fInd=i,e.followers.includes(username))));null!=fFlws&&(fFlws.date-flwrs.date>=0?ret=!0:freshFollows.splice(fInd,1))}return ret}))},function(module,exports,__webpack_require__){"use strict";var __awaiter=this&&this.__awaiter||function(thisArg,_arguments,P,generator){return new(P||(P=Promise))((function(resolve,reject){function fulfilled(value){try{step(generator.next(value))}catch(e){reject(e)}}function rejected(value){try{step(generator.throw(value))}catch(e){reject(e)}}function step(result){var value;result.done?resolve(result.value):(value=result.value,value instanceof P?value:new P((function(resolve){resolve(value)}))).then(fulfilled,rejected)}step((generator=generator.apply(thisArg,_arguments||[])).next())}))},__importDefault=this&&this.__importDefault||function(mod){return mod&&mod.__esModule?mod:{default:mod}};Object.defineProperty(exports,"__esModule",{value:!0});const constants_1=__webpack_require__(0),checkFollow_variable_1=__webpack_require__(4),unfollowList_variable_1=__webpack_require__(5),unfollow_eventsource_1=__webpack_require__(6),interval_promise_1=__importDefault(__webpack_require__(7)),script={getScriptManifest:()=>({name:"Check Follow",description:"Concatenates followers list, adds $checkFollow[user] variable, adds unfollow event.",author:"BigPimpinVoidkin",version:"1.0",firebotVersion:"5"}),getDefaultParameters:()=>({interval:{type:"number",default:60,description:"Interval to repopulate followers in seconds",secondaryDescription:"Enter a number here"},username:{type:"string",default:"",description:"Username to get/check follows of",secondaryDescription:"Leave blank for streamer"}}),run:runRequest=>{const{logger:logger,replaceVariableManager:replaceVariableManager,twitchApi:twitchApi,eventManager:eventManager}=runRequest.modules,em=eventManager,param=runRequest.parameters;param.interval=param.interval>30?param.interval:30;const god=""===param.username?runRequest.firebot.accounts.streamer.username:param.username;constants_1.setLogger(logger),logger.info(`CheckFollow interval: ${param.interval}, username: ${god}`);const first=constants_1.concatFollowers(twitchApi,god,eventManager);constants_1.pushPromise(first);let listening=!1;runRequest.parameters.interval>=30&&interval_promise_1.default((()=>__awaiter(void 0,void 0,void 0,(function*(){try{if(0==listening){listening=!0,yield first;const prom=constants_1.concatFollowers(twitchApi,god,eventManager);constants_1.pushPromise(prom),yield prom,yield constants_1.getUnfollows(eventManager),listening=!1}}catch(e){return logger.error(`CheckFollows interval-promise caught error: ${e}`),void(listening=!1)}}))),1e3*param.interval).catch((e=>logger.error("Bro...? interval-promise error:",e))),eventManager.registerEventSource(unfollow_eventsource_1.unfollowSourceDef),replaceVariableManager.registerReplaceVariable(checkFollow_variable_1.CheckFollowVariable),replaceVariableManager.registerReplaceVariable(unfollowList_variable_1.unfollowListVariable),em.on("event-triggered",(({event:event,source:source,meta:meta,isManual:isManual,isRetrigger:isRetrigger})=>{if("follow"==event.id){const fresh={date:Date.now(),followers:[meta.username.toLowerCase()]};constants_1.pushFreshFollow(fresh)}}))}};exports.default=script},function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.triggerUnfollow=void 0;const constants_1=__webpack_require__(0);exports.triggerUnfollow=(unfollowList,em)=>{em.triggerEvent(constants_1.ID.source,constants_1.ID.event,{unfollowList:unfollowList})}},function(module,exports,__webpack_require__){module.exports=function(n){var t={};function r(e){if(t[e])return t[e].exports;var o=t[e]={i:e,l:!1,exports:{}};return n[e].call(o.exports,o,o.exports,r),o.l=!0,o.exports}return r.m=n,r.c=t,r.d=function(n,t,e){r.o(n,t)||Object.defineProperty(n,t,{enumerable:!0,get:e})},r.r=function(n){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(n,"__esModule",{value:!0})},r.t=function(n,t){if(1&t&&(n=r(n)),8&t)return n;if(4&t&&"object"==typeof n&&n&&n.__esModule)return n;var e=Object.create(null);if(r.r(e),Object.defineProperty(e,"default",{enumerable:!0,value:n}),2&t&&"string"!=typeof n)for(var o in n)r.d(e,o,function(t){return n[t]}.bind(null,o));return e},r.n=function(n){var t=n&&n.__esModule?function(){return n.default}:function(){return n};return r.d(t,"a",t),t},r.o=function(n,t){return Object.prototype.hasOwnProperty.call(n,t)},r.p="",r(r.s=0)}([function(n,t,r){"use strict";var e;r.r(t),function(n){n.REFERENCE="REFERENCE",n.DIFF="DIFF",n.STRING="STRING"}(e||(e={}));var o,u=e;function i(n){return(i="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n})(n)}function f(n){return n&&!Array.isArray(n)&&"object"===i(n)}function a(n){return n&&"string"==typeof n&&n.length>0}function c(n,t){return n.hasOwnProperty?n.hasOwnProperty(t):void 0!==n[t]}function l(n,t,r,e){return void 0===e&&(e=0),{original:n,current:t,status:r,changes:e}}function s(n,t,r){return void 0===r&&(r=0),{_:n,status:t,changes:r}}function p(n){if(this.compareArraysInOrder=!0,this.mode={array:u.DIFF,object:u.DIFF,function:u.REFERENCE},f(n)&&("boolean"==typeof n.compareArraysInOrder&&(this.compareArraysInOrder=n.compareArraysInOrder),f(n.mode))){var t=Object.values(u);if(a(n.mode.array)){var r=n.mode.array.toUpperCase();void 0!==t.find((function(n){return n===r}))&&(this.mode.array=r)}if(a(n.mode.object)){var e=n.mode.object.toUpperCase();void 0!==t.find((function(n){return n===e}))&&(this.mode.object=e)}if(a(n.mode.function)){var o=n.mode.function.toUpperCase();o!==u.REFERENCE&&o!==u.STRING||(this.mode.function=o)}}}!function(n){n.ADDED="ADDED",n.DELETED="DELETED",n.MODIFIED="MODIFIED",n.EQUAL="EQUAL"}(o||(o={}));var y=o;function g(n,t){return n===t?l(n,t,y.EQUAL):l(n,t,y.MODIFIED,1)}function E(n,t){return n.getTime()===t.getTime()?l(n,t,y.EQUAL):l(n,t,y.MODIFIED,1)}function h(n,t){return n.toString()===t.toString()?l(n,t,y.EQUAL):l(n,t,y.MODIFIED,1)}function b(n){return(b="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n})(n)}function D(){var n={string:null,number:null,boolean:null,function:null,object:null},t={};function r(t,r){if(t===r)return l(t,r,y.EQUAL);var e=b(t);if(e!==b(r))return l(t,r,y.MODIFIED,1);var o=n[e];return o?o(t,r):g(t,r)}function e(n,r){var e=Object.prototype.toString.call(n);if(e===Object.prototype.toString.call(r)){var o=t[e];return o?o(n,r):g(n,r)}return l(n,r,y.MODIFIED,1)}return{multipleComparatorSelector:r,deepComparatorSelector:e,getComparatorByType:function(t){return n[t]},configure:function(o){var i,f={};f[u.DIFF]=(i=r,function(n,t){var r={},e=0,o=0,u=0;for(var f in n)c(n,f)&&(++e,c(t,f)?r[f]=i(n[f],t[f]):r[f]=l(n[f],null,y.DELETED,1),u+=r[f].changes);for(var a in t)c(t,a)&&(++o,c(n,a)||(r[a]=l(null,t[a],y.ADDED,1),u+=r[a].changes));return 0===e&&0===o?s(null,y.EQUAL,u):s(r,u>0?y.MODIFIED:y.EQUAL,u)}),f[u.REFERENCE]=function(n,t){var r=g(n,t);return l(n,t,r.status,r.changes)},f[u.STRING]=function(n,t){var r=function(n,t){return JSON.stringify(n)===JSON.stringify(t)?l(n,t,y.EQUAL):l(n,t,y.MODIFIED,1)}(n,t);return l(n,t,r.status,r.changes)};var a={};a[u.DIFF]=o.compareArraysInOrder?function(n){return function(t,r){var e,o,u=0;t.length>r.length||t.length===r.length?(e=t,o=r,u=-1):(e=r,o=t,u=1);var i,f=[],a=0;for(i=0;i<o.length;++i)f.push(n(t[i],r[i])),a+=f[i].changes||0;if(-1===u)for(;i<e.length;++i)f.push(l(t[i],null,y.DELETED,1)),++a;else if(1===u)for(;i<e.length;++i)f.push(l(null,r[i],y.ADDED,1)),++a;return s(f,a>0?y.MODIFIED:y.EQUAL,a)}}(r):function(n){return function(t,r){var e;e=t.length>=r.length?t:r;var o,u,i,f,a,c,p=0,g=[],E=Object.create(null);for(o=0;o<e.length;++o)o<t.length&&(f=t[o],void 0!==(c=E[u=JSON.stringify(f)])&&c.length>0?null!==(a=c[c.length-1]).b?(i=n(f,a.b),g.push(i),c.pop(),0===c.length&&delete E[u]):c.unshift({a:f,b:null}):E[u]=[{a:f,b:null}]),o<r.length&&(f=r[o],void 0!==(c=E[u=JSON.stringify(f)])&&c.length>0?null!==(a=c[c.length-1]).a?(i=n(a.a,f),g.push(i),c.pop(),0===c.length&&delete E[u]):c.unshift({a:null,b:f}):E[u]=[{a:null,b:f}]);var h=Object.create(null);for(var b in h.a=[],h.b=[],E){c=E[b];for(var D=0;D<c.length;++D)(a=c[D]).a?h.b.length>0?(p+=(i=n(a.a,h.b.pop())).changes,g.push(i)):h.a.unshift(a.a):a.b&&(h.a.length>0?(p+=(i=n(h.a.pop(),a.b)).changes,g.push(i)):h.b.unshift(a.b))}for(var v=h.a.length-1;v>-1;--v)g.push(l(h.a[v],null,y.DELETED,1)),++p;for(var m=h.b.length-1;m>-1;--m)g.push(l(null,h.b[m],y.ADDED,1)),++p;return s(g,p>0?y.MODIFIED:y.EQUAL,p)}}(r),a[u.REFERENCE]=function(n,t){var r=g(n,t);return l(n,t,r.status,r.changes)},a[u.STRING]=function(n,t){var r,e,o=(e=t,(r=n).length===e.length&&JSON.stringify(r)===JSON.stringify(e)?l(r,e,y.EQUAL):l(r,e,y.MODIFIED,1));return l(n,t,o.status,o.changes)};var p={};p[u.REFERENCE]=g,p[u.STRING]=h,n.string=g,n.number=g,n.boolean=g,n.function=p[o.mode.function],n.object=e,t["[object Array]"]=a[o.mode.array],t["[object Date]"]=E,t["[object Object]"]=f[o.mode.object]}}}function v(n){return(v="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(n){return typeof n}:function(n){return n&&"function"==typeof Symbol&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n})(n)}var m=function(){return(m=Object.assign||function(n){for(var t,r=1,e=arguments.length;r<e;r++)for(var o in t=arguments[r])Object.prototype.hasOwnProperty.call(t,o)&&(n[o]=t[o]);return n}).apply(this,arguments)},d=Symbol("invalid");function O(n,t){return t===d?Array.isArray(n)?[]:{}:t}var I=function(n,t){if((u=n)&&Array.isArray(u)){for(var r=[],e=void 0,o=0;o<n.length;o++)(e=t(n[o]))!==d&&r.push(e);return 0===r.length?d:r}var u;if("object"===v(n)){var i={},f=(e=void 0,!1);for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(e=t(n[o]))!==d&&(i[o]=e,f=!0);return f?i:d}return t(n)},S=function n(t){return t._?I(t._,n):t.status===y.DELETED?t.original:t.current},A=function n(t){return t._?I(t._,n):t.status===y.ADDED?t.current:t.original},F=function(n){return function t(r){return r._&&r.changes>0?I(r._,t):r.status===y.EQUAL?d:n(r)}},j=function(n){var t=n===y.DELETED?"original":"current",r=n===y.EQUAL;return function e(o){return o._&&(r||o.changes>0)?I(o._,e):o.status===n?o[t]:d}},_=function(n){var t=n===y.EQUAL;return function r(e){return e._&&(t||e.changes>0)?I(e._,r):e.status===n?{current:e.current,original:e.original}:d}},L=function(n){return n&&"original"in n&&"current"in n&&"status"in n},R=function(){function n(n){var t=this;this.compSelector=D(),this.config=null,this.setConfig=function(n){t.config=new p(n),t.compSelector.configure(t.config)},this.getConfig=function(){return{compareArraysInOrder:t.config.compareArraysInOrder,mode:m({},t.config.mode)}},this.compare=function(n,r){return function(n,t,r){var e=v(t);if(e!==v(r))return l(t,r,y.MODIFIED,1);var o=n.getComparatorByType(e);return o?o(t,r):g(t,r)}(t.compSelector,n,r)},this.applyLeftChanges=function(n,t){return void 0===t&&(t=!1),n&&n._?O(n._,I(n._,t?F(A):A)):L(n)?n.original:null},this.applyRightChanges=function(n,t){return void 0===t&&(t=!1),n&&n._?O(n._,I(n._,t?F(S):S)):L(n)?n.current:null},this.filterDiffByStatus=function(n,t,r){void 0===t&&(t=y.MODIFIED),void 0===r&&(r=!1);var e=function(n){if("string"==typeof n){var t=n.trim().toUpperCase();return void 0!==Object.keys(y).find((function(n){return t===n}))?t:null}return null}(t);if(e&&n){if(n._)return O(n._,I(n._,r?_(t):j(t)));if(L(n)&&n.status===e)return(r?_(t):j(t))(n)}return null},this.config=new p(n),this.compSelector.configure(this.config)}return n.DIFF_MODES=u,n.PROPERTY_STATUS=y,n}();t.default=R}]).default},function(module,exports,__webpack_require__){"use strict";var __awaiter=this&&this.__awaiter||function(thisArg,_arguments,P,generator){return new(P||(P=Promise))((function(resolve,reject){function fulfilled(value){try{step(generator.next(value))}catch(e){reject(e)}}function rejected(value){try{step(generator.throw(value))}catch(e){reject(e)}}function step(result){var value;result.done?resolve(result.value):(value=result.value,value instanceof P?value:new P((function(resolve){resolve(value)}))).then(fulfilled,rejected)}step((generator=generator.apply(thisArg,_arguments||[])).next())}))};Object.defineProperty(exports,"__esModule",{value:!0}),exports.CheckFollowVariable=void 0;const constants_1=__webpack_require__(0);exports.CheckFollowVariable={definition:{handle:"checkFollow",usage:"checkFollow[username]",description:"Returns true or false depending on if the user follows the streamer",possibleDataOutput:["text"]},evaluator:(_,username)=>__awaiter(void 0,void 0,void 0,(function*(){return yield constants_1.checkFollow(username.toLowerCase())}))}},function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.unfollowListVariable=void 0;const constants_1=__webpack_require__(0);exports.unfollowListVariable={definition:{handle:"unfollowList",triggers:{event:[`${constants_1.ID.source}:${constants_1.ID.event}`]},description:'Returns a string list of unfollows from unfollow event, formatted as: \'["username1","username2"]\'',examples:[{usage:"$arrayFind[$unfollowList, BigPimpinVoidkin]",description:'Uses arrayFind variable to find username "BigPimpinVoidkin" in unfollowList'}],possibleDataOutput:["text"]},evaluator:({metadata:metadata})=>JSON.stringify(metadata.eventData.unfollowList)}},function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.unfollowSourceDef=void 0;const constants_1=__webpack_require__(0);exports.unfollowSourceDef={id:constants_1.ID.source,name:"Bpvk CheckFollow events",events:[{id:constants_1.ID.event,name:"Unfollow",description:"When someone unfollows"}]}},function(module,exports){module.exports=function(func,intervalLength,options={}){!function(func,intervalLength,options){if("function"!=typeof func)throw new TypeError('Argument 1, "func", must be a function.');if("number"==typeof intervalLength){if(!Number.isInteger(intervalLength)||intervalLength<0)throw new TypeError('Argument 2, "intervalLength", must be a non-negative integer or a function that returns a non-negative integer.')}else if("function"!=typeof intervalLength)throw new TypeError('Argument 2, "intervalLength", must be a non-negative integer or a function that returns a non-negative integer.');if("object"!=typeof options)throw new TypeError('Argument 3, "options", must be an object.');const allowedKeys=["iterations","stopOnError"];if(Object.keys(options).forEach((key=>{if(!allowedKeys.includes(key))throw new TypeError('Option "'+key+'" is not a valid option.')})),void 0!==options.iterations&&options.iterations!==1/0&&(!Number.isInteger(options.iterations)||options.iterations<1))throw new TypeError('Option "iterations" must be Infinity or an integer greater than 0.');if(void 0!==options.stopOnError&&"boolean"!=typeof options.stopOnError)throw new TypeError('Option "stopOnError" must be a boolean.')}(func,intervalLength,options);const defaults={iterations:1/0,stopOnError:!0},settings=Object.assign(defaults,options);return new Promise(((rootPromiseResolve,rootPromiseReject)=>{const callFunction=currentIteration=>{let stopRequested=!1;const stop=()=>{stopRequested=!0},callNext=()=>{currentIteration===settings.iterations||stopRequested?rootPromiseResolve():callFunction(currentIteration+1)},calculatedIntervalLength="function"==typeof intervalLength?intervalLength(currentIteration):intervalLength;"function"!=typeof intervalLength||Number.isInteger(calculatedIntervalLength)&&!(calculatedIntervalLength<0)?setTimeout((()=>{const returnVal=func(currentIteration,stop);var val;null!=(val=returnVal)&&"function"==typeof val.then?returnVal.then(callNext).catch((err=>{settings.stopOnError?rootPromiseReject(err):callNext()})):rootPromiseReject(new Error('Return value of "func" must be a Promise.'))}),calculatedIntervalLength):rootPromiseReject(new Error('Function for "intervalLength" argument must return a non-negative integer.'))};callFunction(1)}))}}]).default;