## Cài đặt và chạy Ansible

### Cài đặt công cụ

Chạy trên máy điều khiển Debian hoặc Ubuntu:

```bash
sudo apt update
sudo apt install -y pipx git
pipx install ansible-core
pipx install netaddr
```

### Tải repository và chuẩn bị inventory

```bash
git clone https://github.com/k3s-io/k3s-ansible.git
cd k3s-ansible
cp inventory-sample.yml inventory.yml
vim inventory.yml
```

### Chạy playbook

```bash
ansible-playbook playbooks/site.yml -i inventory.yml --ask-pass --ask-become-pass
```


### Lỗi thường gặp: thiếu collection Ansible

Nếu gặp lỗi không tìm thấy module `ansible.posix.sysctl`:

```text
couldn't resolve module/action 'ansible.posix.sysctl'
```

Cài các collection cần thiết và kiểm tra danh sách đã cài:

```bash
ansible-galaxy collection install ansible.posix community.general
ansible-galaxy collection list
```
## 1. Cài đặt công cụ

Chạy trên máy điều khiển dùng Debian hoặc Ubuntu:

```bash
sudo apt update
sudo apt install -y pipx git
pipx install ansible-core
pipx install netaddr
```

## 2. Chuẩn bị inventory

Tải repository `k3s-ansible`, tạo inventory từ file mẫu rồi cập nhật thông tin các node:

```bash
git clone https://github.com/k3s-io/k3s-ansible.git
cd k3s-ansible
cp inventory-sample.yml inventory.yml
vim inventory.yml
```

Trong `inventory.yml`, kiểm tra địa chỉ IP, tài khoản SSH, phiên bản K3s và token. Cluster dùng etcd cần số lượng server lẻ (ví dụ: 3, 5 hoặc 7). Giữ token bí mật và không dùng lại mật khẩu cá nhân.

## 3. Triển khai cluster

Chạy playbook từ thư mục repository:

```bash
ansible-playbook playbooks/site.yml -i inventory.yml --ask-pass --ask-become-pass
```

Nhập mật khẩu SSH và mật khẩu `sudo` khi được hỏi. Không ghi các mật khẩu này vào README hoặc commit lên repository.

## 4. Xử lý lỗi Ansible thường gặp

### Không tìm thấy module `ansible.posix.sysctl`

Lỗi thường có dạng:

```text
couldn't resolve module/action 'ansible.posix.sysctl'
```

Cài các collection cần thiết rồi xác nhận chúng đã được cài:

```bash
ansible-galaxy collection install ansible.posix community.general
ansible-galaxy collection list
```

## 5. Kiểm tra ứng dụng và monitoring

Chạy các lệnh sau từ máy client đã cấu hình `kubectl`.

### 5.1. Truy cập ứng dụng mẫu bằng port-forward

Tạo Deployment và Service:

```bash
kubectl create deployment demo-web --image=nginx:stable
kubectl expose deployment demo-web --port=80 --target-port=80
kubectl rollout status deployment/demo-web
kubectl get pods -o wide
```

Mở terminal khác để chuyển tiếp cổng:

```bash
kubectl port-forward svc/demo-web 8080:80
```

Từ máy client, kiểm tra kết nối:

```bash
curl -I http://localhost:8080
```

Phản hồi HTTP như `200 OK` cho biết ứng dụng truy cập được qua Service. `port-forward` phù hợp để kiểm tra nhanh, không thay thế cách expose ứng dụng cho người dùng thực tế.

### 5.2. Truy cập ứng dụng qua NodePort

Đổi Service sang loại `NodePort`:

```bash
kubectl patch svc demo-web -p '{"spec":{"type":"NodePort"}}'
kubectl get svc demo-web
```

Lấy số cổng ở cột `PORT(S)`, sau đó truy cập từ client:

```text
http://<IP-node>:<NodePort>
```

Firewall cần cho phép cổng tương ứng. Không mở cổng ra Internet nếu không cần thiết.

### 5.3. Kiểm tra Grafana và metrics

Kiểm tra trạng thái Pod và Service của Prometheus, Grafana:

```bash
kubectl get pods -A | grep -E 'prometheus|grafana'
kubectl get svc -A | grep -E 'prometheus|grafana'
```

Nếu Grafana nằm trong namespace `monitoring`, có thể truy cập tạm bằng `port-forward`:

```bash
kubectl -n monitoring port-forward svc/<ten-service-grafana> 3000:80
```

Mở [http://localhost:3000](http://localhost:3000), vào dashboard Kubernetes và xác nhận có dữ liệu cho cả 5 node. Tên namespace, Service và cổng có thể khác tùy cách cài monitoring. Nếu không thấy metrics, kiểm tra Prometheus scrape được targets và các targets ở trạng thái `UP`.

### Dọn ứng dụng mẫu

Sau khi kiểm tra xong, xóa Service và Deployment:

```bash
kubectl delete svc demo-web
kubectl delete deployment demo-web
```

## 6. Cấu hình Load Balancer và HA

### 6.1. Keepalived

Cài Keepalived trên cả hai máy load balancer. Trên Debian/Ubuntu, file cấu hình thường nằm tại `/etc/keepalived/keepalived.conf`; kiểm tra file sau khi cài và tạo file nếu chưa có:

```bash
sudo apt update
sudo apt install -y keepalived
sudo ls -l /etc/keepalived/
sudo nano /etc/keepalived/keepalived.conf
```

Hai máy dùng cùng `virtual_router_id` và VIP, nhưng cần `state` và `priority` khác nhau. Thay các giá trị mẫu dưới đây bằng thông tin phù hợp với từng máy:

```conf
vrrp_instance VI_1 {
     state MASTER     # Máy còn lại đặt BACKUP
     interface <ten-interface>
     virtual_router_id 51
     priority 100     # Máy BACKUP cần priority thấp hơn
     advert_int 1
     authentication {
          auth_type PASS
          auth_pass <mat-khau-vrrp>
     }
     virtual_ipaddress {
          <VIP>
     }
}
```

Bật dịch vụ và kiểm tra VIP:

```bash
sudo systemctl enable --now keepalived
sudo systemctl status keepalived
ip addr
```

Dùng `ip addr` để xác nhận VIP đang được gán cho một trong hai máy.

### 6.2. Cluster Load Balancer (HAProxy)

Tham khảo [tài liệu K3s về Cluster Load Balancer](https://docs.k3s.io/datastore/cluster-loadbalancer).