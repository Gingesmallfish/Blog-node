exports.validateRegisterParams = (req, res, next) => {
    const {username, email, password} = req.body;
    const errors = [];

    // 非空校验
    if (!username) errors.push('用户名不能为空');
    if (!email) errors.push('邮箱不能为空');
    if (!password) errors.push('密码不能为空');

    // 用户名格式校验（3-20位字母/数字/下划线）
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        errors.push('用户名需为3-20位字母、数字或下划线');
    }

    // 邮箱格式校验
    if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        errors.push('请输入合法的邮箱地址');
    }

    // 密码强度校验（6-20位，包含字母和数字）
    if (password && !/^(?=.*[a-zA-Z])(?=.*\d).{6,20}$/.test(password)) {
        errors.push('密码需为6-20位，且包含字母和数字');
    }

    // 若有错误，直接返回响应；无错误则执行后续逻辑（next()）
    if (errors.length > 0) {
        return res.status(400).json({
            code: 400,
            msg: errors.join('；'),
            data: null
        });
    }

    next(); // 放行，进入控制器/下一个中间件
};

// 2. 全局异常处理中间件（捕获接口执行过程中的错误，统一返回格式）
exports.errorHandler = (err, req, res, next) => {
    console.log('中间件：捕获到异常', err.message);
    res.status(500).json({
        code: 500,
        msg: '服务器内部错误，请稍后重试',
        data: null
    });
};