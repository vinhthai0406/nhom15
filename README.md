# Hướng dẫn triển khai K3s

Tài liệu này hướng dẫn cài cluster bằng Ansible, triển khai monitoring và cấu hình Load Balancer/HA. Các file cấu hình nằm trong thư mục dự án.

## 1. Cluster Setup

### Cài công cụ trên máy điều khiển

Máy điều khiển cần Debian/Ubuntu, SSH tới các node và quyền `sudo`:

```bash
sudo apt update
sudo apt install -y pipx git
pipx install ansible-core
pipx install netaddr
```

### Cấu hình node

Trong [inventory.yml](inventory.yml), cập nhật IP, tài khoản SSH, phiên bản K3s và token. Với etcd, số lượng server nên là số lẻ (3, 5, 7...). Giữ token bí mật; không lưu mật khẩu SSH trong file.

### Cài K3s

Clone playbook rồi chạy từ thư mục chứa repository `k3s-ansible`. Lệnh dưới đây giả định `inventory.yml` nằm cùng cấp với thư mục vừa clone:

```bash
git clone https://github.com/k3s-io/k3s-ansible.git
cd k3s-ansible
ansible-playbook playbooks/site.yml -i inventory.yml --ask-pass --ask-become-pass
```

Nhập mật khẩu SSH và `sudo` khi Ansible hỏi.

### Xác nhận cluster

Từ máy đã cấu hình `kubectl`, kiểm tra node và Pod:

```bash
kubectl get nodes -o wide
kubectl get pods -A
```

## 2. Monitoring

Playbook [monitoring.yml](monitoring.yml) cài Prometheus và Grafana bằng `kube-prometheus-stack` trên server đầu tiên. Trước khi chạy, đổi mật khẩu Grafana trong file này và không commit mật khẩu thật lên repository.

Chạy từ thư mục dự án:

```bash
ansible-playbook monitoring.yml -i inventory.yml --ask-pass --ask-become-pass
```

Đợi các Pod khởi động, sau đó kiểm tra:

```bash
kubectl get pods -n monitoring
```

Grafana được cấu hình qua NodePort `30300`. Mở `http://<IP-node>:30300` từ máy client; firewall cần cho phép cổng này. Đăng nhập bằng tài khoản `admin` và mật khẩu đã cấu hình, rồi kiểm tra dashboard Kubernetes có dữ liệu.

## 3. Load Balancer và HA

### Keepalived

Cài Keepalived trên các máy Load Balancer được chọn:

```bash
sudo apt update
sudo apt install -y keepalived
```

Dùng [keepalived.conf](keepalived.conf) làm mẫu và đặt cấu hình tại `/etc/keepalived/keepalived.conf` trên từng máy. Điền interface, VIP và mật khẩu; giữ `virtual_router_id` giống nhau, nhưng đặt `state` và `priority` khác nhau giữa các máy.

Bật dịch vụ trên từng máy và xác nhận VIP đang nằm trên một máy:

```bash
sudo systemctl enable --now keepalived
ip addr
```

### HAProxy

Dùng HAProxy để phân phối kết nối tới các server. Xem cấu hình tham khảo trong [tài liệu K3s về Cluster Load Balancer](https://docs.k3s.io/datastore/cluster-loadbalancer).

## Xử lý lỗi Ansible

Nếu gặp lỗi không tìm thấy module `ansible.posix.sysctl`, cài collection cần thiết:

```bash
ansible-galaxy collection install ansible.posix community.general
```