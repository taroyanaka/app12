<script>
    import { onMount } from 'svelte';
    import Gantt from 'frappe-gantt';

    // Firebaseの設定
    const firebase_config = {
        apiKey: "AIzaSyBcOlIDP2KWbJuKM0WeMHNp-WvjTVfLt9Y",
        authDomain: "p2auth-ea50a.firebaseapp.com",
        projectId: "p2auth-ea50a",
        storageBucket: "p2auth-ea50a.appspot.com",
        messagingSenderId: "796225429484",
        appId: "1:796225429484:web:ece56ef2fc0be28cd6eac9"
    };
    firebase.initializeApp(firebase_config);
    const google_provider = new firebase.auth.GoogleAuthProvider();

    let user = null;
    let uid = "";
    let login_result = 'Not logged in';

    let tasks = [
        { id: 'Task 1', name: 'プロジェクト開始', start: '2024-09-01', end: '2024-09-05', progress: 20, uid: "sample-uid-1" },
        { id: 'Task 2', name: '設計フェーズ', start: '2024-09-06', end: '2024-09-10', progress: 40, uid: "sample-uid-1" },
        { id: 'Task 3', name: '開発フェーズ', start: '2024-09-11', end: '2024-09-15', progress: 60, uid: "sample-uid-2" }
    ];

    function getCurrentDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // 月は0から始まるので+1
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    let taskForm = {
        id: null,
        name: '',
        start: getCurrentDate(), // 現在の日付をデフォルト値に設定
        end: '',
        progress: 0,
        uid: null
    };

    let editMode = false;
    let gantt;
    let filterByUid = null;

    function getFilteredTasks() {
        if (filterByUid !== null) {
            return tasks.filter(task => task.uid === filterByUid);
        }
        return tasks;
    }

    onMount(() => {
        renderGantt();
        check_login();
    });

    function renderGantt() {
        const filteredTasks = getFilteredTasks();
        if (gantt) {
            gantt.refresh(filteredTasks);
        } else {
            gantt = new Gantt("#gantt", filteredTasks, {
                view_mode: 'Day',
                date_format: 'YYYY-MM-DD',
                custom_popup_html: function (task) {
                    return `
                        <div class="details-container">
                            <h5>${task.name}</h5>
                            <p>開始日: ${task.start}</p>
                            <p>終了日: ${task.end}</p>
                            <p>進捗: ${task.progress}%</p>
                        </div>
                    `;
                }
            });
        }
    }

    function addOrUpdateTask() {
        uid ? taskForm.uid = uid : taskForm.uid = "sample-uid-1";
        if (editMode) {
            const index = tasks.findIndex(t => t.id === taskForm.id);
            if (index !== -1) {
                tasks = [
                    ...tasks.slice(0, index),
                    { ...taskForm },
                    ...tasks.slice(index + 1)
                ];
            }
        } else {
            const newTask = { ...taskForm, id: `Task ${tasks.length + 1}` };
            tasks = [...tasks, newTask];
        }
        resetForm();
        renderGantt();
    }

    function editTask(index) {
        taskForm = { ...tasks[index] };
        editMode = true;
    }

    function deleteTask(index) {
        tasks = tasks.filter((_, i) => i !== index);
        renderGantt();
    }

    function resetForm() {
        taskForm = { id: null, name: '', start: getCurrentDate(), end: '', progress: 0, uid: null };
        editMode = false;
    }

    function check_login() {
        firebase.auth().onAuthStateChanged(current_user => {
            user = current_user;
            if (user) {
                login_result = `Logged in as: ${user.displayName}`;
                uid = user.uid;
            } else {
                login_result = 'Not logged in';
                uid = "";
            }
        });
    }

    function google_login() {
        firebase.auth().signInWithPopup(google_provider).then(result => {
            user = result.user;
            login_result = `Logged in as: ${user.displayName}`;
        }).catch(error => {
            console.error('Error during Google login:', error);
            alert('Google login failed. ' + error.message);
        });
    }

    function sign_out() {
        firebase.auth().signOut().then(() => {
            user = null;
            login_result = 'Not logged in';
        }).catch(error => {
            console.error('Error during sign-out:', error);
            alert('Sign out failed. ' + error.message);
        });
    }

    function filterTasksByUid(uid) {
        filterByUid = uid;
        renderGantt();
    }

    function clearUserFilter() {
        filterByUid = null;

        renderGantt();
    }
</script>

<style>
    .task-input {
        position: relative; /* 必要に応じて調整 */
        z-index: 10; /* 他の要素より前面に表示 */
    }
    #gantt {
        width: 100%;
        height: 400px;
        margin-bottom: 20px;
    }
</style>

<main>
    <h1>ガントチャート with CRUD</h1>

    <!-- ログイン状態表示 -->
    <p>{login_result}</p>
    {#if user}
        <button on:click={sign_out}>ログアウト</button>
    {:else}
        <button on:click={google_login}>Googleでログイン</button>
    {/if}

    <!-- ガントチャート表示 -->
    <div id="gantt"></div>

    <!-- CRUD用フォーム -->
    <h2>タスクの追加/編集</h2>
    <form on:submit|preventDefault={addOrUpdateTask}>
        <label class="task-input">
            タスク名: 
            <input bind:value={taskForm.name} type="text" required>
        </label><br>
        <label>
            開始日: 
            <input bind:value={taskForm.start} type="date" required>
        </label><br>
        <label>
            終了日: 
            <input bind:value={taskForm.end} type="date" required>
        </label><br>
        <label>
            進捗: 
            <input bind:value={taskForm.progress} type="number" min="0" max="100" required>
        </label><br>
        <button type="submit">{editMode ? '更新' : '追加'}</button>
        <button type="button" on:click={resetForm}>リセット</button>
    </form>

    <!-- タスクリストと削除機能 -->
    <h2>タスクリスト</h2>
    <ul>
        {#each (filterByUid ? getFilteredTasks() : tasks) as task, index}
            <li>
                {task.name} ({task.start} - {task.end}) 進捗: {task.progress}% 
                <button on:click={() => editTask(index)}>編集</button>
                <button on:click={() => deleteTask(index)}>削除</button>
                <button on:click={() => filterTasksByUid(task.uid)}>ユーザー {task.uid} で絞り込む</button>
            </li>
        {/each}
    </ul>
    <button on:click={clearUserFilter}>フィルタ解除</button>
</main>