const { ccclass, property } = cc._decorator;

@ccclass
export default class HotUpdate extends cc.Component {

    @property({
        type: cc.Asset,
    })
    manifestUrl: cc.Asset = null;

    private am: any = null;
    private _updating: boolean = false;
    private _updateListener: any = null;

    private storagePath: String = "";

    checkCb(event) {
        cc.log('Code: ' + event.getEventCode());
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                cc.log("没有找到热更新配置文件,跳过热更新");
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                cc.log("下载远程manifest失败,跳过热更新");
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.log("已经是最新版本了,无需更新.");
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                cc.log("找到新版本了,开始准备下载");
                break;
            default:
                return;
        }

        this.am.setEventCallback(null);
        this._updating = false;
    }

    updateCb(event) {
        let needRestart: boolean = false;  //是否需要重启
        let failed: boolean = false;  //失败
        switch (event.getEventCode()) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                cc.log('没有找到热更新配置文件,跳过热更新');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                cc.log("更新总百分比" + event.getPercent());
                cc.log("更新文件总百分比" + event.getPercentByFile());
                cc.log("下载文件：" + event.getDownloadedFiles() + "/总文件:" + event.getTotalFiles());
                cc.log("下载字节：" + event.getDownloadedBytes() + "/总字节:" + event.getTotalBytes());
                // this.panel.byteProgress.progress = event.getPercent();
                // this.panel.fileProgress.progress = event.getPercentByFile();

                // this.panel.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                // this.panel.byteLabel.string = event.getDownloadedBytes() + ' / ' + event.getTotalBytes();

                // let msg = event.getMessage();
                // if (msg) {
                //     this.panel.info.string = 'Updated file: ' + msg;
                // }
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                // this.panel.info.string = 'Fail to download manifest file, hot update skipped.';
                cc.log("下载远程manifest失败,跳过热更新");
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                // this.panel.info.string = 'Already up to date with the latest remote version.';
                cc.log("已经是最新版本了,无需更新.");
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                cc.log("更新完成" + event.getMessage());
                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                // this.panel.retryBtn.active = true;
                cc.log("更新失败" + event.getMessage());
                this._updating = false;
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                // this.panel.info.string = 'Asset update error: ' + event.getAssetId() + ', ' + event.getMessage();
                cc.log("更新失败-->> " + event.getMessage());
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                // this.panel.info.string = event.getMessage();
                console.log('ERROR_DECOMPRESS-message-->>', event.getMessage());
                cc.log(event.getMessage());
                break;
            default:
                break;
        }

        // 更新失败
        if (failed) {
            this.am.setEventCallback(null);
            this._updateListener = null;
            this._updating = false;
        }

        //更新完成 需要重启
        if (needRestart) {
            this.am.setEventCallback(null);
            this._updateListener = null;
            // Prepend the manifest's search path
            let searchPaths = jsb.fileUtils.getSearchPaths();
            let newPaths = this.am.getLocalManifest().getSearchPaths();
            cc.log(JSON.stringify(newPaths)); //新的Manifest资源路径
            Array.prototype.unshift.apply(searchPaths, newPaths);
            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));//保存,并在新开始游戏前进行检测
            jsb.fileUtils.setSearchPaths(searchPaths);  //设置

            cc.game.restart(); //更新游戏后需要清除已有的环境,需要重启
        }
    }

    checkUpdate() {
        if (this._updating) {
            // this.panel.info.string = 'Checking or updating ...';
            cc.log("正在更新中")
            return;
        }
        if (this.am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            //获取本地url地址
            let url = this.manifestUrl.nativeUrl;
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            //加载本地url
            this.am.loadLocalManifest(url);
        }
        if (!this.am.getLocalManifest() || !this.am.getLocalManifest().isLoaded()) {
            // this.panel.info.string = 'Failed to load local manifest ...';
            cc.log('加载本地热更新文件失败');
            return;
        }
        this.am.setEventCallback(this.checkCb.bind(this));

        this.am.checkUpdate();
        this._updating = true;
    }

    //点击 开始热更新
    hotUpdate() {
        if (this.am && !this._updating) {
            this.am.setEventCallback(this.updateCb.bind(this));

            if (this.am.getState() === jsb.AssetsManager.State.UNINITED) {
                // Resolve md5 url
                let url = this.manifestUrl.nativeUrl;
                if (cc.loader.md5Pipe) {
                    url = cc.loader.md5Pipe.transformURL(url);
                }
                this.am.loadLocalManifest(url);
            }

            this.am.update();
            this._updating = true;
        }
    }

    onLoad() {
        if (!cc.sys.isNative) {
            cc.log("不是原生开发环境,不支持jsb")
            return;
        }
        this.storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'hotUpdate-remote-asset');
        cc.log('Storage --->>' + this.storagePath);

        // Init with empty manifest url for testing custom manifest
        this.am = new jsb.AssetsManager('', this.storagePath, this.versionCompareHandle);

        this.am.setVerifyCallback(this.VerifyCallback);

        cc.log("开始检查更新")

        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate, please do more test and find what's most suitable for your game.
            // 多线程并行下载   根据实际情况设置
            this.am.setMaxConcurrentTask(2);
            cc.log("Max concurrent tasks count have been limited to 2");
        }
    }

    //验证通过热更新下载是否完整
    // Setup the verification callback, but we don't have md5 check function yet, so only print some message
    // Return true if the verification passed, otherwise return false
    private VerifyCallback(path, asset): boolean {
        // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
        let compressed = asset.compressed;
        // Retrieve the correct md5 value.
        let expectedMD5 = asset.md5;
        // asset.path is relative path and path is absolute.
        let relativePath = asset.path;
        // The size of asset file, but this value could be absent.
        let size = asset.size;
        if (compressed) {
            // panel.info.string = "Verification passed : " + relativePath;
            cc.log("Verification passed :" + relativePath);
            return true;
        }
        else {
            // panel.info.string = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
            cc.log("Verification passed :" + relativePath + ' (' + expectedMD5 + ')');
            return true;
        }
    }

    private versionCompareHandle(versionA, versionB) {
        cc.log("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);
        let vA = versionA.split('.');
        let vB = versionB.split('.');
        for (let i = 0; i < vA.length; ++i) {
            let a = parseInt(vA[i]);
            let b = parseInt(vB[i] || 0);
            if (a === b) {
                continue;
            }
            else {
                return a - b;
            }
        }
        if (vB.length > vA.length) {
            return -1;
        }
        else {
            return 0;
        }
    }

    onDestroy() {
        if (this._updateListener) {
            this.am.setEventCallback(null);
            this._updateListener = null;
        }
    }
}
